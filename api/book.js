import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Called by the chat widget when a visitor completes a Cal.com booking
// inside the Mon chat. Captures the booking as a scheduled lead and advances
// the originating conversation. Cal.com remains the source of truth for the
// booking itself; this just records the lead and the funnel stage.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, name, email, notes, when } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  // Carry the conversation's score, floor it at the "booked" level.
  let score = 85;
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('lead_score')
    .eq('session_id', sessionId)
    .single();
  if (session?.lead_score != null) score = Math.max(score, session.lead_score);

  const lead = {
    source: 'chat',
    session_id: sessionId,
    name: name || null,
    email: email || null,
    pain_points: notes || null,
    message: when ? `Booked a discovery call for ${when}` : 'Booked a discovery call via chat',
    stage: 'scheduled',
    score,
    temperature: 'hot',
  };

  const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'session_id' });
  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to save booking' });
  }

  await supabase
    .from('chat_sessions')
    .update({ lead_stage: 'scheduled', lead_score: score, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId);

  return res.status(200).json({ ok: true });
}
