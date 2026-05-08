import { Project, ProjectContext } from '@/types'

/**
 * Maps raw Supabase row (snake_case) to typed Project (camelCase)
 * API returns: id, user_id, name, context, design_md, design_md_source, created_at
 * TypeScript expects: id, userId, name, context, designMd, designMdSource, createdAt
 */
function mapProject(raw: Record<string, unknown>): Project {
  return {
    id: raw.id as string,
    userId: raw.user_id as string,
    name: raw.name as string,
    context: raw.context as ProjectContext,
    designMd: (raw.design_md as string | null) || null,
    designMdSource: (raw.design_md_source as 'uploaded' | 'generated' | null) || null,
    createdAt: raw.created_at as string,
  }
}

/**
 * Fetch all projects for the current user
 */
export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error('Failed to fetch projects')
  const { projects } = await res.json()
  return (projects as Record<string, unknown>[]).map(mapProject)
}

/**
 * Create a new project with the given name
 */
export async function createProject(name: string): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create project')
  const { project } = await res.json()
  return mapProject(project)
}

/**
 * Update project context (business + technical metadata)
 */
export async function updateProjectContext(
  projectId: string,
  context: ProjectContext
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/context`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  })
  if (!res.ok) throw new Error('Failed to update project context')
  const { project } = await res.json()
  return mapProject(project)
}

/**
 * Update project design.md content
 * @param projectId Project ID
 * @param designMd Markdown content
 * @param source Where it came from: 'uploaded' (default) or 'generated'
 */
export async function updateProjectDesignMd(
  projectId: string,
  designMd: string,
  source: 'uploaded' | 'generated' = 'uploaded'
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/design-md`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_md: designMd, source }),
  })
  if (!res.ok) throw new Error('Failed to update design.md')
  const { project } = await res.json()
  return mapProject(project)
}
