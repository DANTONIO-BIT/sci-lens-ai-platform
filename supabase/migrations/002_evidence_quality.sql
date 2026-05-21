-- ============================================================
-- SciLens — Migration 002: Evidence Quality + Domain columns
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Add evidence_quality JSONB column to paper_analysis
ALTER TABLE paper_analysis
ADD COLUMN IF NOT EXISTS evidence_quality JSONB;

-- Add domain column
ALTER TABLE paper_analysis
ADD COLUMN IF NOT EXISTS domain TEXT CHECK (domain IN (
    'pharma_clinical', 'pharma_industrial', 'biotech',
    'medical_device', 'chemicals', 'academic_basic'
));

-- Add regulatory pathway columns
ALTER TABLE paper_analysis
ADD COLUMN IF NOT EXISTS regulatory_pathway TEXT DEFAULT '';

ALTER TABLE paper_analysis
ADD COLUMN IF NOT EXISTS regulatory_timeline TEXT DEFAULT '';

-- Add trl_confidence column (was missing in original schema)
ALTER TABLE paper_analysis
ADD COLUMN IF NOT EXISTS trl_confidence INTEGER CHECK (trl_confidence BETWEEN 0 AND 100);

-- Index for domain-based queries
CREATE INDEX IF NOT EXISTS idx_paper_analysis_domain
ON paper_analysis (domain) WHERE domain IS NOT NULL;

-- Index for evidence quality queries
CREATE INDEX IF NOT EXISTS idx_paper_analysis_evidence
ON paper_analysis USING GIN (evidence_quality) WHERE evidence_quality IS NOT NULL;
