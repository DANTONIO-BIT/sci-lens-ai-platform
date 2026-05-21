-- ============================================================
-- SciLens — Migration 004: File hash for duplicate detection
-- Run in Supabase SQL Editor after 003_research_projects.sql
-- ============================================================

ALTER TABLE papers ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_papers_file_hash
ON papers(user_id, file_hash)
WHERE file_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_papers_doi
ON papers(user_id, doi)
WHERE doi IS NOT NULL;
