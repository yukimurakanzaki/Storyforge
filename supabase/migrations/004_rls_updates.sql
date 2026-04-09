-- Allow users to update their own usage counter
CREATE POLICY "Users can update own counter"
  ON usage_counters FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to insert own profile (for trigger fallback)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
