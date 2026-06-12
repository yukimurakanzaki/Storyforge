-- Migration: enhance_analysis_results_v2
-- Adds v2 columns for enhanced analysis output (gap cards, journey map, score components)
-- All columns nullable with defaults — non-breaking migration

-- Add v2 columns to analysis_results
ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS score_components JSONB,
  ADD COLUMN IF NOT EXISTS ringkasan_temuan JSONB,
  ADD COLUMN IF NOT EXISTS gap_cards JSONB,
  ADD COLUMN IF NOT EXISTS journey_map JSONB,
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

-- Index for filtering by schema version during migration
CREATE INDEX IF NOT EXISTS idx_results_schema_version
  ON analysis_results(schema_version)
  WHERE schema_version IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN analysis_results.schema_version IS
  '1 = legacy format (gapList only), 2 = enhanced format (gap cards + journey + score components)';
