import type { TempSession, ChatMessage, AnalysisResult } from '@/types'

const KEY = 'sf_temp_session'
const TTL_MS = 24 * 60 * 60 * 1000

export function getTempSession(): TempSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as TempSession
    if (Date.now() - new Date(session.createdAt).getTime() > TTL_MS) {
      localStorage.removeItem(KEY)
      return null
    }
    session.qaAnswers ??= []
    return session
  } catch {
    return null
  }
}

export function saveTempSession(session: TempSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function clearTempSession(): void {
  localStorage.removeItem(KEY)
}

export function initTempSession(): TempSession {
  const existing = getTempSession()
  if (existing) return existing

  const session: TempSession = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    brdText: '',
    messages: [],
    result: null,
    requirements: null,
    refinementRounds: 0,
    hasGenerated: false,
    qaAnswers: [],
  }
  saveTempSession(session)
  return session
}

export function incrementRefinementRound(): void {
  const session = getTempSession()
  if (!session) return
  saveTempSession({ ...session, refinementRounds: session.refinementRounds + 1 })
}

export function persistAnalysisState(
  brdText: string,
  messages: ChatMessage[],
  result: AnalysisResult | null
): void {
  const session = getTempSession()
  if (!session) return
  saveTempSession({ ...session, brdText, messages, result })
}
