-- supabase/migrations/006_projects_and_sections.sql

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  context jsonb not null default '{
    "business": {
      "description": "",
      "targetUsers": [],
      "domain": "",
      "compliance": [],
      "namingConventions": {},
      "pastDecisions": []
    },
    "technical": {
      "frontend": "",
      "backend": "",
      "existingSystems": [],
      "integrations": [],
      "constraints": [],
      "techDebt": []
    }
  }'::jsonb,
  design_md text,
  design_md_source text check (design_md_source in ('uploaded', 'generated')),
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add columns to analysis_results
alter table analysis_results
  add column if not exists project_id uuid references projects,
  add column if not exists sections jsonb not null default '{}'::jsonb,
  add column if not exists section_states jsonb not null default '{
    "foundation": "empty",
    "roles": "empty",
    "flow": "empty",
    "engineer": "empty",
    "designer": "empty",
    "qa": "empty",
    "templates": "empty",
    "stakeholder": "empty"
  }'::jsonb,
  add column if not exists requirement_version integer not null default 1,
  add column if not exists session_state text not null default 'refining'
    check (session_state in ('refining', 'ready', 'done'));
