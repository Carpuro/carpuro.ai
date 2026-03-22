-- Run this in Supabase → SQL Editor

-- Chat sessions (one per visitor tab)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   TEXT NOT NULL UNIQUE,
  page         TEXT DEFAULT '/',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Individual chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Contact form leads
CREATE TABLE IF NOT EXISTS contact_leads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  topic        TEXT DEFAULT 'other',
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast session lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);

-- Helpful view: full conversation per session
CREATE OR REPLACE VIEW chat_conversations AS
SELECT
  s.session_id,
  s.page,
  s.created_at AS session_started,
  s.updated_at AS last_activity,
  json_agg(
    json_build_object('role', m.role, 'content', m.content, 'at', m.created_at)
    ORDER BY m.created_at
  ) AS messages
FROM chat_sessions s
LEFT JOIN chat_messages m USING (session_id)
GROUP BY s.session_id, s.page, s.created_at, s.updated_at
ORDER BY s.updated_at DESC;
