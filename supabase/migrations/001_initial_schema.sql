-- ============================================================
-- SciLens — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- STORAGE: Create bucket for PDFs
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('papers', 'papers', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own papers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'papers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own papers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'papers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- TABLE: papers
-- ============================================================
CREATE TABLE IF NOT EXISTS papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL DEFAULT 'Untitled',
  authors       TEXT[] DEFAULT '{}',
  abstract      TEXT DEFAULT '',
  journal       TEXT,
  year          INTEGER,
  doi           TEXT,
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing', 'analyzed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their papers"
ON papers FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: paper_chunks (embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id      UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  embedding     VECTOR(1024),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paper_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their chunks"
ON paper_chunks FOR ALL
TO authenticated
USING (
  paper_id IN (SELECT id FROM papers WHERE user_id = auth.uid())
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS paper_chunks_embedding_idx
ON paper_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================================
-- TABLE: paper_analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_analysis (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id             UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  trl_level            INTEGER CHECK (trl_level BETWEEN 1 AND 9),
  trl_confidence       INTEGER CHECK (trl_confidence BETWEEN 0 AND 100),
  trl_description      TEXT,
  startup_score        INTEGER CHECK (startup_score BETWEEN 0 AND 100),
  market_opportunity   TEXT,    -- JSON string of tam_estimate object
  tam_estimate         TEXT,    -- numeric string in billions USD
  regulatory_complexity TEXT CHECK (regulatory_complexity IN ('low', 'medium', 'high')),
  technical_barriers   TEXT,
  synthesis            TEXT,
  extracted_methods    TEXT[] DEFAULT '{}',
  extracted_claims     TEXT[] DEFAULT '{}',
  raw_json             JSONB,   -- full AnalysisResult for flexible access
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paper_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their analysis"
ON paper_analysis FOR ALL
TO authenticated
USING (
  paper_id IN (SELECT id FROM papers WHERE user_id = auth.uid())
);

-- ============================================================
-- TABLE: paper_connections (semantic similarity graph)
-- ============================================================
CREATE TABLE IF NOT EXISTS paper_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id_a      UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
  paper_id_b      UUID REFERENCES papers(id) ON DELETE CASCADE NOT NULL,
  similarity      FLOAT NOT NULL CHECK (similarity BETWEEN 0 AND 1),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paper_id_a, paper_id_b, user_id)
);

ALTER TABLE paper_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their connections"
ON paper_connections FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: match_paper_chunks (pgvector similarity search)
-- Used by the backend to find semantically similar papers
-- ============================================================
CREATE OR REPLACE FUNCTION match_paper_chunks(
  query_embedding   VECTOR(1024),
  match_user_id     UUID,
  exclude_paper_id  UUID,
  match_count       INT DEFAULT 5
)
RETURNS TABLE (
  paper_id    UUID,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    pc.paper_id,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM paper_chunks pc
  INNER JOIN papers p ON p.id = pc.paper_id
  WHERE p.user_id = match_user_id
    AND pc.paper_id != exclude_paper_id
    AND pc.embedding IS NOT NULL
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
