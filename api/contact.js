import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const tempFromScore = (s) => (s >= 70 ? 'hot' : s >= 30 ? 'warm' : 'cold');

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, topic, message, sessionId, notes, company,
          budget, referralSource, services } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const cleanServices = Array.isArray(services)
    ? services.map((s) => String(s).slice(0, 60)).slice(0, 12)
    : null;

  // If this lead came out of a chat, carry the conversation's score over and
  // attribute the source to the chat funnel.
  let score = 40; // a submitted form is already a warm signal
  // A stated budget is a strong qualifying signal — nudge the score up.
  if (budget && /\$|k\b|\d/i.test(budget) && !/not\s*sure/i.test(budget)) score += 20;
  if (sessionId) {
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('lead_score')
      .eq('session_id', sessionId)
      .single();
    if (session?.lead_score != null) score = Math.max(score, session.lead_score);
  }

  // Upsert so a returning chat visitor doesn't create duplicate leads
  // (unique index on session_id). Contact-only leads have null session_id.
  const lead = {
    source: sessionId ? 'chat' : 'contact_form',
    session_id: sessionId || null,
    name,
    email,
    company: company || null,
    topic: topic || 'other',
    pain_points: notes || null,
    message,
    budget: budget || null,
    referral_source: referralSource || null,
    services: cleanServices,
    stage: 'new',
    score,
    temperature: tempFromScore(score),
  };

  const { error } = sessionId
    ? await supabase.from('leads').upsert(lead, { onConflict: 'session_id' })
    : await supabase.from('leads').insert(lead);

  if (error) {
    console.error('Supabase error:', error.message);
    return res.status(500).json({ error: 'Failed to save contact' });
  }

  // Advance the originating conversation to "contacted".
  if (sessionId) {
    await supabase
      .from('chat_sessions')
      .update({ lead_stage: 'contacted', updated_at: new Date().toISOString() })
      .eq('session_id', sessionId);
  }

  return res.status(200).json({ ok: true });
}
