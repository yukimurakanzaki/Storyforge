-- Output Trust Layer: confidence metadata persistence and per-gap feedback.

ALTER TABLE analysis_results
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS requirements JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'done',
  ADD CONSTRAINT analysis_results_status_check
    CHECK (status IN ('finalizing', 'done', 'archived'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_results_session_id
  ON analysis_results(session_id)
  WHERE session_id IS NOT NULL;

CREATE POLICY "Users can update own results"
  ON analysis_results FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS gap_feedback (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id   UUID        REFERENCES analysis_results(id) ON DELETE CASCADE NOT NULL,
  gap_index     INTEGER     NOT NULL CHECK (gap_index >= 0),
  gap_text      TEXT        NOT NULL,
  category      TEXT,
  confidence    TEXT        CHECK (confidence IN ('high', 'medium', 'low')),
  feedback_type TEXT        NOT NULL CHECK (feedback_type IN ('inaccurate', 'duplicate', 'irrelevant')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, analysis_id, gap_index, feedback_type)
);

CREATE INDEX IF NOT EXISTS idx_gap_feedback_analysis
  ON gap_feedback(analysis_id);

ALTER TABLE gap_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gap feedback"
  ON gap_feedback FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gap feedback"
  ON gap_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gap feedback"
  ON gap_feedback FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gap feedback"
  ON gap_feedback FOR DELETE USING (auth.uid() = user_id);
