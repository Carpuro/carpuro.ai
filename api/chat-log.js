import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Move a session forward through the funnel based on what was said.
// Stages only advance, never regress.
const STAGE_RANK = { browsing: 0, interested: 1, qualified: 2, scheduled: 3, contacted: 4 };

function detectStage(role, content, currentStage) {
  const text = (content || '').toLowerCase();
  const cur = currentStage || 'browsing';

  if (role !== 'user') return cur;

  let candidate = cur;
  if (/\b(schedule|book|call|agendar|llamada|reuni[oó]n|cita)\b/.test(text)) candidate = 'qualified';
  else if (/\b(pipeline|etl|elt|warehouse|snowflake|bigquery|spark|airflow|dbt|kafka|databricks|data|datos|empresa|company|team|equipo|project|proyecto)\b/.test(text)) candidate = 'interested';

  // Never downgrade.
  return STAGE_RANK[candidate] > STAGE_RANK[cur] ? candidate : cur;
}

// Lightweight lead score (0-100) from funnel stage + engagement.
function scoreSession(stage, messageCount) {
  const base = { browsing: 5, interested: 35, qualified: 65, scheduled: 85, contacted: 90 }[stage] ?? 5;
  const engagement = Math.min((messageCount || 0) * 2, 15);
  return Math.min(base + engagement, 100);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, role, content, page, stage } = req.body || {};
  if (!sessionId || !role || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Current session state (for stage progression + message count).
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('lead_stage, message_count')
    .eq('session_id', sessionId)
    .single();

  const currentStage = session?.lead_stage || 'browsing';
  const newStage = stage || detectStage(role, content, currentStage);
  const newCount = (session?.message_count || 0) + 1;

  // Coarse geo from Vercel edge headers — analytics only, never the raw IP.
  const h = req.headers;
  const city = h['x-vercel-ip-city'];

  await supabase.from('chat_sessions').upsert(
    {
      session_id: sessionId,
      page: page || '/',
      updated_at: new Date().toISOString(),
      lead_stage: newStage,
      message_count: newCount,
      lead_score: scoreSession(newStage, newCount),
      country: h['x-vercel-ip-country'] || null,
      region: h['x-vercel-ip-country-region'] || null,
      city: city ? decodeURIComponent(city) : null,
    },
    { onConflict: 'session_id', ignoreDuplicates: false }
  );

  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
    page: page || null,
    stage: newStage,
  });

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to save message' });
  }

  return res.status(200).json({ ok: true, stage: newStage });
}
