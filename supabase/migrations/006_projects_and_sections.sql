-- Create projects table
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

-- RLS
alter table projects enable row level security;

create policy "Users can manage their own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add new columns to analysis_results
alter table analysis_results
  add column if not exists project_id uuid references projects,
  add column if not exists sections jsonb default '{}'::jsonb,
  add column if not exists section_states jsonb default '{
    "foundation": "empty",
    "roles": "empty",
    "flow": "empty",
    "engineer": "empty",
    "designer": "empty",
    "qa": "empty",
    "templates": "empty",
    "stakeholder": "empty"
  }'::jsonb,
  add column if not exists requirement_version integer default 1,
  add column if not exists session_state text default 'refining'
    check (session_state in ('refining', 'ready', 'done'));
