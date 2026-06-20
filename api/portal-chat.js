// Portal project assistant — a project-aware chat for LOGGED-IN clients only.
// Separate from the marketing chat (api/chat.js, lead-gen): this one verifies the
// client's Supabase JWT and answers strictly about THEIR own projects, using
// service-role reads scoped to their user id. No sales pitch, no other clients.
import { createClient } from '@supabase/supabase-js';

const MODEL = 'gemini-2.5-flash-lite';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const BUCKET_LABEL = { todo: 'to do', in_progress: 'in progress', done: 'done' };

async function buildContext(userId) {
  const { data: projects } = await admin
    .from('projects')
    .select('id, name, status, progress, summary, target_date')
    .eq('client_id', userId);

  if (!projects || projects.length === 0) return 'This client has no active projects yet.';

  const ids = projects.map((p) => p.id);
  const [{ data: updates }, { data: tasks }] = await Promise.all([
    admin.from('project_updates').select('project_id, title, body, created_at')
      .in('project_id', ids).order('created_at', { ascending: false }).limit(24),
    admin.from('project_tasks').select('project_id, title, status_bucket').in('project_id', ids),
  ]);

  return projects.map((p) => {
    const pTasks = (tasks || []).filter((t) => t.project_id === p.id);
    const done = pTasks.filter((t) => t.status_bucket === 'done').length;
    const taskLine = pTasks.length ? ` Tasks: ${done}/${pTasks.length} done.` : '';
    const inProg = pTasks.filter((t) => t.status_bucket === 'in_progress').map((t) => t.title);
    const inProgLine = inProg.length ? ` In progress: ${inProg.join(', ')}.` : '';
    const pUpd = (updates || []).filter((u) => u.project_id === p.id).slice(0, 3)
      .map((u) => `    • ${u.title || 'Update'}: ${(u.body || '').slice(0, 200)}`).join('\n');
    return `Project "${p.name}" — status: ${p.status}, progress: ${p.progress}%`
      + `${p.target_date ? `, target ${p.target_date}` : ''}.`
      + `${p.summary ? ` Summary: ${p.summary}.` : ''}${taskLine}${inProgLine}`
      + `${pUpd ? `\n  Recent updates:\n${pUpd}` : ''}`;
  }).join('\n\n');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require a valid Supabase session.
  const authH = req.headers.authorization || '';
  const jwt = authH.startsWith('Bearer ') ? authH.slice(7) : '';
  if (!jwt) return res.status(401).json({ error: 'Sign in required' });
  const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
  if (uErr || !user) return res.status(401).json({ error: 'Invalid session' });

  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Assistant not configured' });

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' });
  const userMessage = message.slice(0, 1000);

  const { data: profile } = await admin.from('profiles')
    .select('full_name, company').eq('id', user.id).maybeSingle();
  const context = await buildContext(user.id);

  const who = profile?.full_name || 'the client';
  const SYSTEM_PROMPT =
    `You are the carpuro.ai project assistant for ${who}${profile?.company ? ` at ${profile.company}` : ''} — `
    + `a logged-in client of Carlos Pulido Rosas (data engineering). Help them understand the status of THEIR projects.\n\n`
    + `RULES:\n`
    + `1. Be concise, warm, and factual. Short paragraphs.\n`
    + `2. Use ONLY the project context below. Never invent status, dates, deliverables, or tasks.\n`
    + `3. If something isn't in the context, say you don't have that detail and offer to have Carlos follow up.\n`
    + `4. Never mention or reveal any other client. Only discuss this client's projects.\n`
    + `5. Detect the user's language and reply in it.\n\n`
    + `CLIENT PROJECT CONTEXT:\n${context}`;

  const contents = [];
  for (const turn of Array.isArray(history) ? history.slice(-10) : []) {
    if (!turn?.content) continue;
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.content).slice(0, 2000) }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const FALLBACK = "I couldn't reach the assistant for a moment. Please try again shortly, or reach Carlos via the Contact link.";
  const fail = () => res.status(200).json({ reply: FALLBACK, fallback: true });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.4, maxOutputTokens: 700, topP: 0.95 },
  });

  let data = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body }
      );
      if (r.ok) { data = await r.json(); break; }
      if ((r.status === 429 || r.status === 503) && attempt < 3) { await sleep(400 * attempt); continue; }
      console.error('Gemini error', r.status);
      return fail();
    } catch (e) {
      if (attempt < 3) { await sleep(400 * attempt); continue; }
      console.error('Gemini fetch failed', e.message);
      return fail();
    }
  }
  if (!data) return fail();

  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return res.status(200).json({ reply: reply || "I'm not sure about that one — I can have Carlos follow up." });
}
