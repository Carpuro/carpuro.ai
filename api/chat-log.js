import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, role, content, page } = req.body;

  if (!sessionId || !role || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Upsert session row (creates if not exists, updates timestamp if exists)
  await supabase.from('chat_sessions').upsert(
    { session_id: sessionId, page: page || '/', updated_at: new Date().toISOString() },
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
