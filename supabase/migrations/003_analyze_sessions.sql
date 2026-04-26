-- Canonical analyze session store — replaces analysis_history
-- Each row is one analysis workspace session tied to a user.
CREATE TABLE analyze_sessions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status       TEXT        DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  requirement_context TEXT,
  messages     JSONB       DEFAULT '[]',
  current_analysis JSONB,
  artifact     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analyze_sessions_updated_at
  BEFORE UPDATE ON analyze_sessions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Indexes for common queries
CREATE INDEX idx_analyze_sessions_user_status
  ON analyze_sessions(user_id, status, created_at DESC);

-- RLS
ALTER TABLE analyze_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON analyze_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON analyze_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON analyze_sessions FOR UPDATE USING (auth.uid() = user_id);
