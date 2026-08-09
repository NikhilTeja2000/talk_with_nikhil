-- Turn traces table for complete observability into every voice/live turn
CREATE TABLE turn_traces (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id              TEXT UNIQUE NOT NULL,
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_id               INT NOT NULL,

  started_at            TIMESTAMPTZ NOT NULL,
  user_turn_ended_at    TIMESTAMPTZ,
  model_started_at      TIMESTAMPTZ,
  first_audio_at        TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ NOT NULL,

  model                 TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,

  user_input            TEXT,
  assistant_output      TEXT,

  end_to_end_ttfa_ms    INT,
  model_ttfa_ms         INT,
  retrieval_latency_ms  INT DEFAULT 0,
  tool_latency_ms       INT DEFAULT 0,
  total_duration_ms     INT NOT NULL,

  retrieval_events      JSONB DEFAULT '[]'::jsonb,
  tool_calls            JSONB DEFAULT '[]'::jsonb,
  gap_detection         JSONB,
  guardrail_results     JSONB DEFAULT '{}'::jsonb,

  status                TEXT NOT NULL CHECK (status IN ('success', 'interrupted', 'cancelled', 'error')),
  interrupted           BOOLEAN DEFAULT false,
  error                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_turn_traces_session ON turn_traces(session_id);
CREATE INDEX idx_turn_traces_session_turn ON turn_traces(session_id, turn_id);
CREATE INDEX idx_turn_traces_created ON turn_traces(created_at);
CREATE INDEX idx_turn_traces_status ON turn_traces(status);

-- RLS: No public access. Backend service-role writes; authenticated admin reads.
ALTER TABLE turn_traces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "turn_traces_admin_read" ON turn_traces
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "turn_traces_service_write" ON turn_traces
  FOR ALL USING (auth.role() = 'service_role');
