import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, status = 'closed' } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  if (!['closed', 'abandoned'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update({ status, closed_at: new Date().toISOString() })
    .eq('session_id', sessionId);

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to close session' });
  }

  return res.status(200).json({ ok: true });
}
