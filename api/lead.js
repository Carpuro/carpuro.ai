import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Called by the chat widget when a visitor hands over their email mid-conversation
// (before/without booking). Creates or updates the chat-sourced lead so a chatter
// who never books still becomes a follow-up-able lead. Never downgrades a lead
// that already booked (scheduled) or was contacted/won.
const STAGE_RANK = { new: 0, qualified: 1, scheduled: 2, contacted: 3, won: 4, lost: 0 };
const tempFromScore = (s) => (s >= 70 ? 'hot' : s >= 30 ? 'warm' : 'cold');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, email, name, notes } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email' });

  // Carry the conversation's score; handing over an email is a qualified signal.
  let score = 55;
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('lead_score, lead_stage')
    .eq('session_id', sessionId)
    .single();
  if (session?.lead_score != null) score = Math.max(score, session.lead_score);

  // Don't regress a lead that already advanced past "qualified".
  const { data: existing } = await supabase
    .from('leads')
    .select('stage, score, name')
    .eq('session_id', sessionId)
    .single();
  const keepStage = existing && STAGE_RANK[existing.stage] > STAGE_RANK.qualified;
  const stage = keepStage ? existing.stage : 'qualified';
  if (existing?.score != null) score = Math.max(score, existing.score);

  const lead = {
    source: 'chat',
    session_id: sessionId,
    name: name || existing?.name || null,
    email,
    pain_points: notes || null,
    message: 'Shared email in chat',
    stage,
    score,
    temperature: tempFromScore(score),
  };

  const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'session_id' });
  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to save lead' });
  }

  // Advance the conversation to at least "qualified" without regressing it.
  const sessRank = { browsing: 0, interested: 1, qualified: 2, scheduled: 3, contacted: 4 };
  const curStage = session?.lead_stage || 'browsing';
  const nextStage = (sessRank[curStage] ?? 0) < sessRank.qualified ? 'qualified' : curStage;
  await supabase
    .from('chat_sessions')
    .update({ lead_stage: nextStage, lead_score: score, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId);

  return res.status(200).json({ ok: true });
}
