// hooks/useWorkspace.ts
'use client'
import { useCallback, useRef, useState } from 'react'
import { readSSEStream } from '@/lib/sse-client'
import { emptyClientState, withOptimisticUserMessage, resolvedQuestions } from '@/lib/workspace/client-state'
import type { WorkspaceState } from '@/types/workspace'

export type ArtifactTab = 'gaps' | 'prd'

export interface UseWorkspace {
  sessionId: string
  state: WorkspaceState | null
  isSending: boolean
  error: string | null
  activeTab: ArtifactTab
  lastResolved: string[]
  setActiveTab: (t: ArtifactTab) => void
  sendMessage: (text: string) => Promise<void>
  generatePrd: () => Promise<void>
  answerGap: (gapId: string, answer: string) => Promise<void>
  dismissGap: (gapId: string) => Promise<void>
  startNewSession: () => void
  loadSession: (sessionId: string) => Promise<void>
}

export function useWorkspace(projectId: string | null = null): UseWorkspace {
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [state, setState] = useState<WorkspaceState | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ArtifactTab>('gaps')
  const [lastResolved, setLastResolved] = useState<string[]>([])
  const stateRef = useRef<WorkspaceState | null>(null)
  stateRef.current = state

  const post = useCallback(async (message: string) => {
    if (isSending) return
    setError(null); setIsSending(true)
    const before = stateRef.current
    setState(withOptimisticUserMessage(before, sessionId, message))
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, projectId }),
      })
      if (!res.ok) { setError('Gagal memproses. Coba lagi.'); setState(before); return }
      for await (const event of readSSEStream(res)) {
        if (event.name === 'done') {
          const data = event.data as { state: WorkspaceState; resolvedGapIds: string[]; intent: string }
          setLastResolved(resolvedQuestions(before?.gaps ?? [], data.resolvedGapIds ?? []))
          setState(data.state)
          if (data.intent === 'command' && data.state.prd) setActiveTab('prd')
        } else if (event.name === 'error') {
          setError((event.data as { error: string }).error || 'Terjadi kesalahan.'); setState(before)
        }
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.'); setState(before)
    } finally { setIsSending(false) }
  }, [isSending, sessionId, projectId])

  const sendMessage = useCallback((text: string) => post(text), [post])
  const generatePrd = useCallback(() => post('Tolong tulis PRD-nya sekarang.'), [post])

  const patchGap = useCallback(async (body: Record<string, unknown>) => {
    setError(null)
    try {
      const res = await fetch('/api/workspace/gap', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...body }),
      })
      if (!res.ok) { setError('Gagal menyimpan jawaban. Coba lagi.'); return }
      const { state: next } = await res.json() as { state: WorkspaceState }
      setState(next)
    } catch { setError('Gagal menyimpan jawaban. Coba lagi.') }
  }, [sessionId])

  const answerGap = useCallback((gapId: string, answer: string) => patchGap({ gapId, answer }), [patchGap])
  const dismissGap = useCallback((gapId: string) => patchGap({ gapId, outOfScope: true }), [patchGap])

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID()); setState(null); setError(null); setLastResolved([]); setActiveTab('gaps')
  }, [])

  const loadSession = useCallback(async (id: string) => {
    setError(null); setSessionId(id)
    try {
      const res = await fetch(`/api/workspace?sessionId=${encodeURIComponent(id)}`)
      if (!res.ok) { setError('Sesi tidak ditemukan.'); return }
      const { state: loaded } = await res.json() as { state: WorkspaceState }
      setState(loaded); setActiveTab(loaded.prd ? 'prd' : 'gaps')
    } catch { setError('Gagal memuat sesi.') }
  }, [])

  return { sessionId, state: state ?? (null), isSending, error, activeTab, lastResolved,
    setActiveTab, sendMessage, generatePrd, answerGap, dismissGap, startNewSession, loadSession }
}

// keep emptyClientState importable for consumers that want a non-null shell
export { emptyClientState }
