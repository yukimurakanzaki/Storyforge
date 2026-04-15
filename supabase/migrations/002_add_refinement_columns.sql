-- Migration: Add refinement and requirements columns to analysis_history
-- Run this in Supabase Dashboard → SQL Editor
--
-- Depends on: analysis_history table (created manually in Supabase dashboard — not in migrations/)
--
-- After running, verify in Table Editor → analysis_history that 3 new columns appear:
--   refinement_messages (jsonb, nullable)
--   requirements        (jsonb, nullable)
--   status              (text, nullable, default 'done')

ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS refinement_messages jsonb,
  ADD COLUMN IF NOT EXISTS requirements         jsonb,
  ADD COLUMN IF NOT EXISTS status               text DEFAULT 'done';
