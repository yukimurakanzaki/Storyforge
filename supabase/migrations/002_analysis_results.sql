-- Analysis results (persistent history)
CREATE TABLE analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  brd_text TEXT NOT NULL,
  gap_list JSONB NOT NULL DEFAULT '[]',
  clarification_questions JSONB NOT NULL DEFAULT '[]',
  readiness_score INTEGER NOT NULL,
  readiness_label TEXT NOT NULL,
  session_id TEXT,
  parent_analysis_id UUID REFERENCES analysis_results(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_results_user ON analysis_results(user_id, created_at DESC);

ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own results"
  ON analysis_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results"
  ON analysis_results FOR INSERT WITH CHECK (auth.uid() = user_id);
