-- Migration: Add refinement and requirements columns to analysis_history
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS refinement_messages jsonb,
  ADD COLUMN IF NOT EXISTS requirements         jsonb,
  ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'done';
