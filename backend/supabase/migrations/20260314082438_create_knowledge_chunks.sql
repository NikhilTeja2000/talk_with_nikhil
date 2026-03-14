CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE knowledge_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table  TEXT NOT NULL,
  source_id     UUID NOT NULL,
  chunk_type    TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  tags          TEXT[],
  embedding     vector(768),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chunks_type ON knowledge_chunks(chunk_type);
CREATE INDEX idx_chunks_tags ON knowledge_chunks USING GIN(tags);
CREATE INDEX idx_chunks_content_trgm ON knowledge_chunks USING GIN(content gin_trgm_ops);
CREATE INDEX idx_chunks_source ON knowledge_chunks(source_table, source_id);
