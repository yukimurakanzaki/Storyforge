import { RequirementsResult, UserStory } from '@/types'

function storyToMarkdown(story: UserStory): string {
  const parts: string[] = []

  parts.push(`## ${story.title}`)
  parts.push(`\n**Sebagai** ${story.asA}, **ingin** ${story.iWant}, **agar** ${story.soThat}.`)

  parts.push(`\n### INVEST\n`)
  parts.push(`- **I — Independent:** ${story.investNotes.independent}`)
  parts.push(`- **N — Negotiable:** ${story.investNotes.negotiable}`)
  parts.push(`- **V — Valuable:** ${story.investNotes.valuable}`)
  parts.push(`- **E — Estimable:** ${story.investNotes.estimable}`)
  parts.push(`- **S — Small:** ${story.investNotes.small}`)
  parts.push(`- **T — Testable:** ${story.investNotes.testable}`)

  parts.push(`\n### Acceptance Criteria\n`)
  for (const scenario of story.acceptanceCriteria) {
    parts.push(`**Scenario:** ${scenario.title}`)
    parts.push(`**Given** ${scenario.given.join('; ')}`)
    parts.push(`**When** ${scenario.when.join('; ')}`)
    parts.push(`**Then** ${scenario.then.join('; ')}`)
    parts.push('')
  }

  if (story.fieldContextTable && story.fieldContextTable.length > 0) {
    parts.push(`### Field Context\n`)
    parts.push(`| Field | Deskripsi | Tipe Data | Contoh |`)
    parts.push(`|---|---|---|---|`)
    for (const row of story.fieldContextTable) {
      parts.push(`| ${row.fieldName} | ${row.description} | ${row.dataType} | ${row.example} |`)
    }
    parts.push('')
  }

  return parts.join('\n')
}

export function buildMarkdown(requirements: RequirementsResult): string {
  if (requirements.userStories.length === 0) return ''
  return requirements.userStories.map(storyToMarkdown).join('\n---\n\n')
}
