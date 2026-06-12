// lib/analysis/normalize-prd.ts
//
// Defensive normalizer for the model's `prd` field. The contract (types/workspace
// PrdDraft) is { markdown: string; openQuestions: string[]; assumptions: string[] },
// but the LLM sometimes drifts and returns a richer structured object instead:
//   { title, epics: [{ title, description, userStories: [...] }],
//     openQuestions: [{ question, impact, priority }], assumptions: [...],
//     technicalNotes: [...] }  // and no top-level `markdown`
//
// Rendering those objects directly as React children crashes the PRD panel, and a
// missing `markdown` would render an empty PRD. This coerces ANY shape the model
// returns into the contract so the UI can never crash and rich content is preserved.

type NormalizedPrd = { markdown: string; openQuestions: string[]; assumptions: string[] }

function asString(item: unknown): string {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>
    const text = o.question ?? o.text ?? o.title ?? o.description
    if (typeof text === 'string') {
      const priority = typeof o.priority === 'string' ? ` (${o.priority})` : ''
      return `${text}${priority}`
    }
    return JSON.stringify(item)
  }
  return item == null ? '' : String(item)
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(asString).filter((s) => s.trim().length > 0)
}

/** Render a structured epics[] array into readable markdown (fallback when the
 *  model omits a top-level `markdown` string). */
function epicsToMarkdown(epics: unknown, title: unknown): string {
  if (!Array.isArray(epics)) return ''
  const lines: string[] = []
  if (typeof title === 'string' && title.trim()) lines.push(`# ${title.trim()}`, '')
  for (const epic of epics) {
    if (!epic || typeof epic !== 'object') continue
    const e = epic as Record<string, unknown>
    if (typeof e.title === 'string') lines.push(`## ${e.title}`)
    if (typeof e.description === 'string') lines.push('', e.description)
    const stories = Array.isArray(e.userStories) ? e.userStories : []
    for (const story of stories) {
      if (!story || typeof story !== 'object') continue
      const s = story as Record<string, unknown>
      const heading = typeof s.title === 'string' ? s.title : 'User Story'
      lines.push('', `### ${heading}`)
      if (typeof s.asA === 'string' && typeof s.iWant === 'string') {
        const soThat = typeof s.soThat === 'string' ? ` sehingga ${s.soThat}` : ''
        lines.push('', `Sebagai ${s.asA}, saya ingin ${s.iWant}${soThat}.`)
      }
      const ac = Array.isArray(s.acceptanceCriteria) ? s.acceptanceCriteria : []
      if (ac.length > 0) {
        lines.push('', '**Acceptance Criteria:**')
        for (const c of ac) lines.push(`- ${asString(c)}`)
      }
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

/** Coerce any model `prd` payload into the PrdDraft body contract, or null. */
export function normalizePrd(raw: unknown): NormalizedPrd | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  let markdown = typeof o.markdown === 'string' ? o.markdown : ''
  if (!markdown.trim()) markdown = epicsToMarkdown(o.epics, o.title)

  const assumptions = asStringArray(o.assumptions)
  for (const note of asStringArray(o.technicalNotes)) {
    assumptions.push(`Catatan teknis: ${note}`)
  }

  // If the model returned literally nothing usable, treat as no PRD.
  if (!markdown.trim() && asStringArray(o.openQuestions).length === 0 && assumptions.length === 0) {
    return null
  }

  return {
    markdown,
    openQuestions: asStringArray(o.openQuestions),
    assumptions,
  }
}
