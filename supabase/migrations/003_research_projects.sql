-- research_projects: groups papers under a named research initiative
CREATE TABLE research_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  domain      TEXT DEFAULT 'pharma_clinical'
              CHECK (domain IN (
                'pharma_clinical','pharma_industrial','biotech',
                'medical_device','chemicals','agro_health','academic_basic'
              )),
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own projects"
  ON research_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- paper_project_mapping: many-to-many, a paper can belong to multiple projects
CREATE TABLE paper_project_mapping (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
  paper_id    UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, paper_id)
);

ALTER TABLE paper_project_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own mappings"
  ON paper_project_mapping
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- indexes for common query patterns
CREATE INDEX idx_projects_user_id    ON research_projects(user_id);
CREATE INDEX idx_projects_status     ON research_projects(status);
CREATE INDEX idx_mapping_project_id  ON paper_project_mapping(project_id);
CREATE INDEX idx_mapping_paper_id    ON paper_project_mapping(paper_id);
CREATE INDEX idx_mapping_user_id     ON paper_project_mapping(user_id);

-- extend paper_analysis.domain CHECK to include agro_health
-- (drop old constraint, add new one)
ALTER TABLE paper_analysis
  DROP CONSTRAINT IF EXISTS paper_analysis_domain_check;

ALTER TABLE paper_analysis
  ADD CONSTRAINT paper_analysis_domain_check
  CHECK (domain IN (
    'pharma_clinical','pharma_industrial','biotech',
    'medical_device','chemicals','agro_health','academic_basic'
  ));
