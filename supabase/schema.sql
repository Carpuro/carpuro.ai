-- carpuro.ai — Supabase schema for conversational lead capture.
-- Run in Supabase → SQL Editor. Safe to re-run (idempotent: IF NOT EXISTS everywhere).
--
-- Pipeline:  visitor chats (intake)  ->  Mon qualifies  ->  session scored & staged
--            ->  visitor books a call / submits contact form  ->  row in `leads`.
--
-- Lead stages (chat_sessions.lead_stage and leads.stage):
--   browsing -> interested -> qualified -> scheduled -> contacted -> won | lost
-- Temperature (derived from score): cold (<30), warm (30-69), hot (>=70).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. CHAT SESSIONS — one row per visitor conversation (the intake record)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id    TEXT NOT NULL UNIQUE,
  page          TEXT DEFAULT '/',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Columns added since the first version (safe on an existing table):
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS lead_stage    TEXT DEFAULT 'browsing';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS status        TEXT DEFAULT 'active';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS closed_at     TIMESTAMPTZ;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS lead_score    INTEGER DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS referrer      TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS utm_source    TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS utm_medium    TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS utm_campaign  TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS user_agent    TEXT;

DO $$ BEGIN
  ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_stage_chk
    CHECK (lead_stage IN ('browsing','interested','qualified','scheduled','contacted','won','lost'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_status_chk
    CHECK (status IN ('active','closed','abandoned'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. CHAT MESSAGES — every turn of every conversation
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS page  TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS stage TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. LEADS — the unified CRM table. A lead is created when a conversation (or
--    the contact form) yields contact details. `source` says where it came from
--    and `session_id` links a chat-originated lead back to its conversation.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source       TEXT NOT NULL DEFAULT 'contact_form'
                 CHECK (source IN ('contact_form','chat','manual')),
  session_id   TEXT REFERENCES chat_sessions(session_id) ON DELETE SET NULL,
  name         TEXT,
  email        TEXT,
  company      TEXT,
  phone        TEXT,
  topic        TEXT,                      -- "Topic" select from the contact form
  intent       TEXT,                      -- short inferred intent / service interest
  pain_points  TEXT,                      -- qualifying answers / conversation notes
  message      TEXT,                      -- the visitor's own message
  stage        TEXT NOT NULL DEFAULT 'new'
                 CHECK (stage IN ('new','qualified','scheduled','contacted','won','lost')),
  score        INTEGER DEFAULT 0,
  temperature  TEXT DEFAULT 'cold' CHECK (temperature IN ('cold','warm','hot')),
  assigned_to  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- One lead per chat session (a conversation converts once). Postgres treats
-- NULLs as distinct, so contact-form leads (session_id IS NULL) are never
-- collapsed together. A plain (non-partial) unique index is what ON CONFLICT
-- (session_id) needs for the upsert in api/contact.js to work.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_session ON leads(session_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. INDEXES
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_stage   ON chat_sessions(lead_stage);
CREATE INDEX IF NOT EXISTS idx_leads_stage           ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_created         ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email           ON leads(email);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. updated_at auto-touch trigger
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trg_leads_touch ON leads;
CREATE TRIGGER trg_leads_touch BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 6. ROW-LEVEL SECURITY
--    Enable RLS and add NO public policies. The serverless API uses the
--    service-role key, which bypasses RLS; the public anon key gets nothing.
--    This keeps lead PII unreadable from the browser.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. VIEWS for the operator (query with the service key / SQL editor)
-- ───────────────────────────────────────────────────────────────────────────

-- security_invoker: these views run with the *querying* role's permissions, so
-- they respect RLS. Without it a view is SECURITY DEFINER and would let the anon
-- (browser) key read lead PII through PostgREST, bypassing the RLS above.

-- Full conversation per session.
CREATE OR REPLACE VIEW chat_conversations WITH (security_invoker = true) AS
SELECT
  s.session_id,
  s.page,
  s.lead_stage,
  s.status,
  s.lead_score,
  s.message_count,
  s.created_at AS session_started,
  s.updated_at AS last_activity,
  json_agg(
    json_build_object('role', m.role, 'content', m.content, 'at', m.created_at)
    ORDER BY m.created_at
  ) FILTER (WHERE m.id IS NOT NULL) AS messages
FROM chat_sessions s
LEFT JOIN chat_messages m USING (session_id)
GROUP BY s.session_id, s.page, s.lead_stage, s.status, s.lead_score, s.message_count, s.created_at, s.updated_at
ORDER BY s.updated_at DESC;

-- Pipeline snapshot: how many leads / what value sit in each stage.
CREATE OR REPLACE VIEW lead_pipeline WITH (security_invoker = true) AS
SELECT
  stage,
  temperature,
  COUNT(*)            AS leads,
  ROUND(AVG(score))   AS avg_score,
  MAX(created_at)     AS latest
FROM leads
GROUP BY stage, temperature
ORDER BY
  array_position(ARRAY['new','qualified','scheduled','contacted','won','lost'], stage),
  array_position(ARRAY['hot','warm','cold'], temperature);

-- A lead with its originating conversation inlined (for review/follow-up).
CREATE OR REPLACE VIEW leads_with_conversation WITH (security_invoker = true) AS
SELECT
  l.*,
  c.messages AS conversation
FROM leads l
LEFT JOIN chat_conversations c USING (session_id)
ORDER BY l.created_at DESC;
