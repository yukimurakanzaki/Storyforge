import { RequirementsResult } from '@/types'

export function buildMarkdown(requirements: RequirementsResult): string {
  if (requirements.epics.length === 0) return ''

  return requirements.epics
    .map((epic) => {
      const storiesMarkdown = epic.stories
        .map((story) => {
          const criteria = story.acceptanceCriteria
            .map((c) => `- ${c}`)
            .join('\n')
          return `### ${story.title}\n\n${story.description}\n\n**Acceptance Criteria:**\n${criteria}`
        })
        .join('\n\n')
      return `## ${epic.title}\n\n${epic.description}\n\n${storiesMarkdown}`
    })
    .join('\n\n---\n\n')
}
