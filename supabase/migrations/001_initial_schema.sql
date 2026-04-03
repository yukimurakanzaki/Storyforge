-- Users profile (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis events (WAA tracking + usage enforcement)
CREATE TABLE analysis_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'analysis_started', 'analysis_completed'
  word_count INTEGER,
  token_count INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage counters (rolling 30-day free tier)
CREATE TABLE usage_counters (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_analysis_at TIMESTAMPTZ,
  count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  plan TEXT DEFAULT 'free', -- 'free', 'pro'
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'grace_period', 'frozen'
  xendit_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  consent_v15_accepted_at TIMESTAMPTZ, -- UU PDP compliance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_user_week
  ON analysis_events(user_id, created_at DESC);
CREATE INDEX idx_events_session
  ON analysis_events(user_id, session_id, event_type);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own events"
  ON analysis_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events"
  ON analysis_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own counter"
  ON usage_counters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);
