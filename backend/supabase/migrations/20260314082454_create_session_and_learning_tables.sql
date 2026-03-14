CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    TIMESTAMPTZ DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  turn_count    INT DEFAULT 0,
  topics        TEXT[],
  user_agent    TEXT,
  ip_address    TEXT,
  status        TEXT DEFAULT 'active'
);

CREATE TABLE transcript_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker       TEXT NOT NULL CHECK (speaker IN ('user', 'ai')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transcript_session ON transcript_messages(session_id, created_at);

CREATE TABLE question_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_question         TEXT NOT NULL,
  ai_answer             TEXT,
  topic                 TEXT,
  retrieval_hits        INT DEFAULT 0,
  retrieval_score       REAL DEFAULT 0,
  confidence_score      REAL DEFAULT 0,
  gap_flag              BOOLEAN DEFAULT false,
  gap_reason            TEXT CHECK (gap_reason IN (
    'NO_CONTEXT_FOUND',
    'LOW_RETRIEVAL_CONFIDENCE',
    'GENERIC_ANSWER',
    'EXPLICIT_UNCERTAINTY',
    'USER_REPHRASED',
    'USER_UNSATISFIED',
    'ADMIN_MARKED_INCOMPLETE'
  )),
  severity              TEXT CHECK (severity IN ('low', 'medium', 'high')),
  status                TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  admin_answer          TEXT,
  knowledge_target      TEXT,
  escalated_to_whatsapp BOOLEAN DEFAULT false,
  escalated_at          TIMESTAMPTZ,
  owner_reply           TEXT,
  owner_replied_at      TIMESTAMPTZ,
  resolution_type       TEXT CHECK (resolution_type IN (
    'resolved_live', 'resolved_async', 'resolved_dashboard', 'pending_review'
  )),
  created_at            TIMESTAMPTZ DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);

CREATE INDEX idx_questions_session ON question_events(session_id);
CREATE INDEX idx_questions_gap ON question_events(gap_flag, status);
CREATE INDEX idx_questions_topic ON question_events(topic);

CREATE TABLE knowledge_updates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_question_id    UUID REFERENCES question_events(id),
  topic                 TEXT,
  admin_answer          TEXT NOT NULL,
  target_table          TEXT NOT NULL,
  target_id             UUID,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  created_at            TIMESTAMPTZ DEFAULT now(),
  applied_at            TIMESTAMPTZ
);
