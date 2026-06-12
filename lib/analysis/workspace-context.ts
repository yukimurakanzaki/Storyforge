// lib/analysis/workspace-context.ts
import type { WorkspaceState } from '@/types/workspace'
import type { ChatMessage } from '@/types'
import { buildWorkspaceSystemPrompt } from '@/lib/prompts/workspace'

export const KEEP_VERBATIM = 12

/** True when more than KEEP_VERBATIM un-summarised messages exist. */
export function needsCompaction(state: WorkspaceState, keep = KEEP_VERBATIM): boolean {
  return state.messages.length - state.summarizedUpTo > keep
}

/** The oldest un-summarised messages that should be folded into the summary. */
export function compactionSlice(state: WorkspaceState, keep = KEEP_VERBATIM): ChatMessage[] {
  const end = state.messages.length - keep
  return state.messages.slice(state.summarizedUpTo, end)
}

/** Fold `summary` into contextSummary and advance the summarised pointer. Pure. */
export function applyCompaction(state: WorkspaceState, summary: string, keep = KEEP_VERBATIM): WorkspaceState {
  const end = state.messages.length - keep
  const merged = state.contextSummary ? `${state.contextSummary}\n${summary}` : summary
  return { ...state, contextSummary: merged, summarizedUpTo: Math.max(state.summarizedUpTo, end) }
}

/** Build the bounded Anthropic payload: system (context + canonical state + summary) + verbatim tail. */
export function buildModelPayload(state: WorkspaceState, contextBlock: string): {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
} {
  const tail = state.messages.slice(state.summarizedUpTo)
  return {
    system: buildWorkspaceSystemPrompt({ contextBlock, state }),
    messages: tail.map((m) => ({ role: m.role, content: m.content })),
  }
}
