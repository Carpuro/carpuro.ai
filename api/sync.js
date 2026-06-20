// Project workflow sync: pulls items from external PM tools (GitHub Projects v2,
// Jira Cloud) into the neutral `project_tasks` model, and recomputes each
// project's progress. Secured by CRON_SECRET (Vercel cron sends it automatically;
// manual triggers must send `Authorization: Bearer <CRON_SECRET>`).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ---- status normalization → 3 buckets the portal renders ----
function ghBucket(name) {
  const s = (name || '').toLowerCase();
  if (/done|closed|complete|shipped|merged|deployed/.test(s)) return 'done';
  if (/progress|review|doing|started|dev|qa|testing/.test(s)) return 'in_progress';
  return 'todo';
}
function jiraBucket(categoryKey) {
  if (categoryKey === 'done') return 'done';
  if (categoryKey === 'indeterminate') return 'in_progress';
  return 'todo';
}

// ---- GitHub Projects v2 adapter (GraphQL) ----
// config: { owner, projectNumber, ownerType?: 'user'|'org', statusField?: 'Status' }
async function fetchGithub(integration) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');
  const cfg = integration.config || {};
  const owner = cfg.owner;
  const number = Number(cfg.projectNumber);
  if (!owner || !number) throw new Error('github config needs { owner, projectNumber }');
  const ownerType = cfg.ownerType === 'org' ? 'organization' : 'user';
  const statusField = cfg.statusField || 'Status';

  const query = `query($login:String!,$number:Int!,$cursor:String){
    ${ownerType}(login:$login){
      projectV2(number:$number){
        items(first:100, after:$cursor){
          pageInfo{ hasNextPage endCursor }
          nodes{
            id
            fieldValueByName(name:"${statusField}"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
            content{
              __typename
              ... on Issue { title url number updatedAt assignees(first:1){ nodes{ login } } }
              ... on PullRequest { title url number updatedAt assignees(first:1){ nodes{ login } } }
              ... on DraftIssue { title updatedAt }
            }
          }
        }
      }
    }
  }`;

  const tasks = [];
  let cursor = null;
  do {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { login: owner, number, cursor } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error('GitHub: ' + json.errors.map((e) => e.message).join('; '));
    const proj = json.data?.[ownerType]?.projectV2;
    if (!proj) throw new Error('GitHub: project not found (check owner/number/ownerType)');
    for (const it of proj.items.nodes) {
      const c = it.content || {};
      const statusName = it.fieldValueByName?.name || null;
      tasks.push({
        external_id: it.id,
        external_url: c.url || null,
        title: c.title || '(untitled)',
        status_raw: statusName,
        status_bucket: ghBucket(statusName),
        assignee: c.assignees?.nodes?.[0]?.login || null,
        source_updated_at: c.updatedAt || null,
      });
    }
    cursor = proj.items.pageInfo.hasNextPage ? proj.items.pageInfo.endCursor : null;
  } while (cursor);
  return tasks;
}

// ---- Jira Cloud adapter (REST v3, basic auth) ----
// config: { baseUrl?, jql? }  external_ref = Jira project key (used if no jql)
async function fetchJira(integration) {
  const cfg = integration.config || {};
  const baseUrl = (cfg.baseUrl || process.env.JIRA_BASE_URL || '').replace(/\/$/, '');
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !token) throw new Error('Jira creds not set (JIRA_BASE_URL/EMAIL/API_TOKEN)');
  const jql = cfg.jql || `project = "${integration.external_ref}" ORDER BY updated DESC`;
  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  const tasks = [];
  let startAt = 0;
  // hard cap to avoid runaway loops
  for (let page = 0; page < 20; page++) {
    const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,status,assignee,updated&maxResults=100&startAt=${startAt}`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error('Jira: HTTP ' + res.status + ' ' + (await res.text()).slice(0, 140));
    const json = await res.json();
    for (const issue of json.issues || []) {
      const cat = issue.fields?.status?.statusCategory?.key;
      tasks.push({
        external_id: issue.id,
        external_url: `${baseUrl}/browse/${issue.key}`,
        title: issue.fields?.summary || issue.key,
        status_raw: issue.fields?.status?.name || null,
        status_bucket: jiraBucket(cat),
        assignee: issue.fields?.assignee?.displayName || null,
        source_updated_at: issue.fields?.updated || null,
      });
    }
    startAt += json.maxResults || 100;
    if (startAt >= (json.total || 0)) break;
  }
  return tasks;
}

async function syncIntegration(integration) {
  const tasks = integration.source === 'github'
    ? await fetchGithub(integration)
    : await fetchJira(integration);

  // Full refresh for this project+source (tasks are derived/ephemeral).
  await supabase.from('project_tasks').delete()
    .eq('project_id', integration.project_id).eq('source', integration.source);
  if (tasks.length) {
    const now = new Date().toISOString();
    const rows = tasks.map((t) => ({
      ...t, project_id: integration.project_id, source: integration.source, synced_at: now,
    }));
    const { error } = await supabase.from('project_tasks').insert(rows);
    if (error) throw new Error('insert: ' + error.message);
  }
  return tasks.length;
}

async function recomputeProgress(projectId) {
  const { data } = await supabase.from('project_tasks').select('status_bucket').eq('project_id', projectId);
  if (!data || !data.length) return;
  const done = data.filter((t) => t.status_bucket === 'done').length;
  const progress = Math.round((done / data.length) * 100);
  await supabase.from('projects').update({ progress }).eq('id', projectId);
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: integrations, error } = await supabase.from('project_integrations').select('*');
    if (error) throw new Error(error.message);

    const results = [];
    const touchedProjects = new Set();
    for (const integ of integrations || []) {
      try {
        const n = await syncIntegration(integ);
        touchedProjects.add(integ.project_id);
        await supabase.from('project_integrations')
          .update({ last_synced_at: new Date().toISOString(), last_sync_status: `ok: ${n} tasks` })
          .eq('id', integ.id);
        results.push({ id: integ.id, source: integ.source, tasks: n });
      } catch (e) {
        await supabase.from('project_integrations')
          .update({ last_synced_at: new Date().toISOString(), last_sync_status: 'error: ' + e.message })
          .eq('id', integ.id);
        results.push({ id: integ.id, source: integ.source, error: e.message });
      }
    }
    for (const pid of touchedProjects) await recomputeProgress(pid);

    return res.status(200).json({ ok: true, synced: results.length, results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
