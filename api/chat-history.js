// Returns the stored conversation for a session so the widget can resume it on
// a return visit. The DB (Supabase) is the source of truth; the browser only
// keeps the session id. Read-only, service key, validates the id shape.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = req.query.sessionId;
  // Only accept the widget's own UUIDs — never let an arbitrary id enumerate rows.
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session id' });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to load history' });
  }

  const messages = (data || []).map(m => ({ role: m.role, content: m.content }));
  return res.status(200).json({ messages });
}
