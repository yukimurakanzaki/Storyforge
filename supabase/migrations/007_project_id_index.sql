create index if not exists idx_analysis_results_project_id
  on analysis_results(project_id)
  where project_id is not null;
