-- supabase/migrations/007_project_id_index.sql
-- Add index on analysis_results.project_id for query performance
-- Add updated_at to projects for sort-by-activity support

create index if not exists idx_analysis_results_project_id
  on analysis_results(project_id);
