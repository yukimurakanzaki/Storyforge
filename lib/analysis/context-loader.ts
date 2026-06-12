// lib/analysis/context-loader.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserContext } from '@/types/workspace'
import type { ProjectContext } from '@/types'

/** Pure formatter — turns the merged context into the prompt-prepended block. */
export function formatContextBlock(uc: UserContext | null, project: { name: string; context: ProjectContext } | null): string {
  const lines: string[] = []
  if (uc) {
    if (uc.industry) lines.push(`Industri: ${uc.industry}`)
    if (uc.role) lines.push(`Peran user: ${uc.role}`)
    if (uc.compliance.length) lines.push(`Regulasi/compliance yang berlaku: ${uc.compliance.join(', ')}`)
    const td = Object.entries(uc.techDefaults || {})
    if (td.length) lines.push(`Default teknis: ${td.map(([k, v]) => `${k}: ${v}`).join(', ')}`)
    if (uc.standingInstructions) lines.push(`Instruksi tetap dari user: ${uc.standingInstructions}`)
    if (uc.prdTemplate) lines.push(`TEMPLATE PRD yang HARUS diikuti saat menulis PRD:\n${uc.prdTemplate}`)
  }
  if (project) {
    lines.push(`\nKONTEKS PROJECT: ${project.name}`)
    if (project.context.business?.domain) lines.push(`Domain: ${project.context.business.domain}`)
    if (project.context.business?.compliance?.length) lines.push(`Compliance project: ${project.context.business.compliance.join(', ')}`)
    if (project.context.technical?.backend) lines.push(`Backend: ${project.context.technical.backend}`)
    if (project.context.technical?.constraints?.length) lines.push(`Batasan teknis: ${project.context.technical.constraints.join(', ')}`)
  }
  if (lines.length === 0) return ''
  return `KONTEKS YANG SUDAH DIKETAHUI (baca dulu — jangan tanyakan hal yang sudah dijawab di sini; tandai pelanggaran/kontradiksi sebagai gap constraint_conflict):\n${lines.join('\n')}`
}

/** Load user + project context and return the formatted block ('' when none). */
export async function loadContextLayers(
  supabase: SupabaseClient, userId: string, projectId: string | null,
): Promise<string> {
  const { data: ucRow } = await supabase
    .from('user_context')
    .select('industry, role, compliance, tech_defaults, standing_instructions, prd_template')
    .eq('user_id', userId).single()

  const uc: UserContext | null = ucRow ? {
    industry: ucRow.industry ?? '', role: ucRow.role ?? '',
    compliance: (ucRow.compliance ?? []) as string[],
    techDefaults: (ucRow.tech_defaults ?? {}) as Record<string, string>,
    standingInstructions: ucRow.standing_instructions ?? '', prdTemplate: ucRow.prd_template ?? '',
  } : null

  let project: { name: string; context: ProjectContext } | null = null
  if (projectId) {
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', userId).single()
    if ((sub?.plan as string) === 'pro') {
      const { data: p } = await supabase.from('projects').select('name, context').eq('id', projectId).single()
      if (p) project = { name: p.name as string, context: p.context as ProjectContext }
    }
  }
  return formatContextBlock(uc, project)
}
