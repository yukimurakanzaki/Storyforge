-- Migration: user_context — per-user global memory read before every analysis.
CREATE TABLE IF NOT EXISTS user_context (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  industry TEXT DEFAULT '',
  role TEXT DEFAULT '',
  compliance TEXT[] DEFAULT '{}',
  tech_defaults JSONB DEFAULT '{}'::jsonb,
  standing_instructions TEXT DEFAULT '',
  prd_template TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own context select" ON user_context FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own context insert" ON user_context FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own context update" ON user_context FOR UPDATE USING (auth.uid() = user_id);
