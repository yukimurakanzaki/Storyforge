-- Migration: living_workspace
-- Evolves analysis_results into a living-session record. All columns nullable/defaulted (non-breaking).
ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS gaps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS prd JSONB,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS context_summary TEXT DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS summarized_up_to INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flow_chart TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_results_last_active
  ON analysis_results(user_id, last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_results_starred
  ON analysis_results(user_id, starred) WHERE starred = true;

-- Living sessions use status = 'active'; widen the existing CHECK (added in migration 005).
ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_status_check;
ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_status_check
  CHECK (status IN ('finalizing', 'done', 'archived', 'active'));

COMMENT ON COLUMN analysis_results.gaps IS 'WorkspaceGap[] — structured living gap list (supersedes gap_list + clarification_questions)';
COMMENT ON COLUMN analysis_results.prd IS 'PrdDraft — living PRD (markdown + openQuestions + assumptions + version)';
