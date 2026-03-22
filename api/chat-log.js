import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Detect lead stage from conversation content
function detectStage(role, content, currentStage) {
  const text = content.toLowerCase();

  // Already at highest stage — don't downgrade
  if (currentStage === 'scheduled') return 'scheduled';
  if (currentStage === 'contacted') return 'contacted';

  // User mentioned scheduling or wants a call
  if (role === 'user' && (
    text.includes('schedule') || text.includes('book') || text.includes('call') ||
    text.includes('agendar') || text.includes('llamada') || text.includes('reunión')
  )) return 'qualified';

  // Bot asked qualifying questions and user responded with specifics
  if (role === 'user' && (
    text.includes('pipeline') || text.includes('etl') || text.includes('warehouse') ||
    text.includes('snowflake') || text.includes('bigquery') || text.includes('spark') ||
    text.includes('airflow') || text.includes('dbt') || text.includes('data') ||
    text.includes('datos') || text.includes('empresa') || text.includes('company')
  )) return 'interested';

  // First user message — browsing
  if (role === 'user' && currentStage === 'browsing') return 'browsing';

  return currentStage || 'browsing';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, role, content, page, stage } = req.body;

  if (!sessionId || !role || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get current session to check existing stage
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('lead_stage')
    .eq('session_id', sessionId)
    .single();

  const currentStage = session?.lead_stage || 'browsing';
  const newStage = stage || detectStage(role, content, currentStage);

  // Upsert session with updated stage
  await supabase.from('chat_sessions').upsert(
    {
      session_id: sessionId,
      page: page || '/',
      updated_at: new Date().toISOString(),
      lead_stage: newStage,
    },
    { onConflict: 'session_id', ignoreDuplicates: false }
  );

  // Insert message
  const { error } = await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role,
    content,
  });

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to save message' });
  }

  return res.status(200).json({ ok: true });
}
