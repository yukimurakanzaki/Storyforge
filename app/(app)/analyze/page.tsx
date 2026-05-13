'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { RefinementChat } from '@/components/analyze/RefinementChat'
import { SAMPLE_BRD } from '@/lib/constants'
import type {
  AnalysisResult,
  ChatMessage,
  QAAnswer,
  RequirementsResult,
  Project,
  SectionStates,
  SessionState,
  FoundationData,
} from '@/types'
import Link from 'next/link'
import { SessionSidebar } from '@/components/analyze/SessionSidebar'
import { ProjectSelector } from '@/components/analyze/ProjectSelector'
import { LivingDocument } from '@/components/analyze/LivingDocument'
import {
  initTempSession,
  saveTempSession,
  incrementRefinementRound,
  getTempSession,
  persistAnalysisState,
} from '@/lib/session/temp-session'
import { useMigrateTempSession } from '@/lib/session/use-migrate-temp-session'
import { createClient } from '@/lib/supabase/client'
import {
  canGuestAnalyze,
  incrementGuestUsage,
  readGuestUsage,
} from '@/lib/guest-usage'
import { readSSEStream } from '@/lib/sse-client'

interface RefineAPIResponse {
  message: string
  readyToFinalize: boolean
  analysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'> | null
}

type AppPhase = 'select-project' | 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'

const DEFAULT_SECTION_STATES: SectionStates = {
  foundation: 'empty',
  roles: 'empty',
  flow: 'empty',
  engineer: 'empty',
  designer: 'empty',
  qa: 'empty',
  templates: 'empty',
  stakeholder: 'empty',
}

function buildFirstAssistantMessage(analysis: AnalysisResult): string {
  if (analysis.clarificationQuestions.length === 0) {
    return 'Analisis selesai. Readiness score sudah cukup tinggi — klik "Generate User Stories" saat siap.'
  }
  return `Ditemukan ${analysis.gapList.length} gap dan ${analysis.clarificationQuestions.length} pertanyaan klarifikasi. Jawab pertanyaan di atas atau ketik langsung di sini untuk iterasi.`
}

function AnalyzingState({ streamingText }: { streamingText: string }) {
  return (
    <div
      role="status"
      aria-label="Menganalisis BRD"
      className="flex flex-col items-center justify-center flex-1 gap-4 py-20"
    >
      <div
        aria-hidden="true"
        className="w-10 h-10 rounded-full border-teal-200 border-t-teal-600 animate-spin"
        style={{ borderWidth: 3, borderStyle: 'solid' }}
      />
      <p className="text-sm text-gray-500 font-medium">Menganalisis BRD...</p>
      <p className="text-xs text-gray-400">Biasanya selesai dalam 15–30 detik</p>
      {streamingText && (
        <div className="mt-4 max-w-xl w-full px-4">
          <pre className="text-xs text-gray-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-100">
            {streamingText}
          </pre>
        </div>
      )}
    </div>
  )
}

function buildQASubmissionMessage(
  questions: string[],
  qaAnswers: QAAnswer[]
): string {
  const lines = questions
    .map((q, i) => {
      const qa = qaAnswers[i]
      if (!qa || (!qa.answer.trim() && !qa.isOutOfScope)) return null
      if (qa.isOutOfScope) return `${i + 1}. ${q}\n   → Di luar scope`
      return `${i + 1}. ${q}\n   → ${qa.answer.trim()}`
    })
    .filter(Boolean)
  return `Berikut jawaban saya:\n\n${lines.join('\n\n')}`
}

export default function AnalyzePage() {
  const [brdText, setBrdText] = useState('')
  const [phase, setPhase] = useState<AppPhase>('select-project')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)
  const [streamingText, setStreamingText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [requirements, setRequirements] = useState<RequirementsResult | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null)
  const [showPaywallCTA, setShowPaywallCTA] = useState(false)
  const [guestUsage, setGuestUsage] = useState<{ count: number; limit: number }>({
    count: 0,
    limit: 5,
  })
  const [qaAnswers, setQaAnswers] = useState<QAAnswer[]>([])
  const [resolvedIndices, setResolvedIndices] = useState<number[]>([])
  const [foundationData, setFoundationData] = useState<FoundationData | null>(null)
  const [sectionStates, setSectionStates] = useState<SectionStates>(DEFAULT_SECTION_STATES)
  const [sessionState, setSessionState] = useState<SessionState>('refining')
  const isFinalizingRef = useRef(false)

  useMigrateTempSession(isAuthenticated)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setIsAuthenticated(!!user)
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        setUserPlan((sub?.plan as 'free' | 'pro') ?? 'free')
      } else {
        setGuestUsage(readGuestUsage())
        setPhase('input')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
      if (!session?.user) {
        setGuestUsage(readGuestUsage())
        setUserPlan(null)
        setPhase(prev => prev === 'select-project' ? 'input' : prev)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (phase !== 'refining' && phase !== 'finalizing') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  useEffect(() => {
    const session = initTempSession()
    if (session.refinementRounds >= 3 || session.hasGenerated) {
      setShowAccountPrompt(true)
    }
  }, [])

  useEffect(() => {
    if (!result) return
    setQaAnswers((prev) => {
      const next = [...prev]
      while (next.length < result.clarificationQuestions.length) {
        next.push({ answer: '', isOutOfScope: false })
      }
      return next
    })
  }, [result])

  function handleProjectSelect(project: Project) {
    if (isAuthenticated && (!userPlan || userPlan === 'free')) {
      setShowPaywallCTA(true)
      return
    }
    setSelectedProject(project)
    setPhase('input')
  }

  function handleNewSession() {
    setBrdText('')
    setPhase(isAuthenticated ? 'select-project' : 'input')
    setSelectedProject(null)
    setResult(undefined)
    setMessages([])
    setQaAnswers([])
    setResolvedIndices([])
    setRequirements(null)
    setError(undefined)
    setShowAccountPrompt(false)
    setFoundationData(null)
    setSectionStates(DEFAULT_SECTION_STATES)
    setSessionState('refining')
    isFinalizingRef.current = false
  }

  async function handleAnalyze(text: string) {
    if (!isAuthenticated) {
      const usageCheck = canGuestAnalyze()
      setGuestUsage({ count: usageCheck.count, limit: usageCheck.limit })
      if (!usageCheck.allowed) {
        setError('Batas analisis gratis tercapai. Masuk untuk menyimpan riwayat dan melanjutkan analisis.')
        setShowAccountPrompt(true)
        return
      }
    }

    setPhase('analyzing')
    setStreamingText('')
    setResult(undefined)
    setError(undefined)
    setMessages([])
    setQaAnswers([])
    setResolvedIndices([])
    setRequirements(null)
    setFoundationData(null)
    setSectionStates(DEFAULT_SECTION_STATES)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!isAuthenticated ? { 'x-guest-mode': '1' } : {}),
        },
        body: JSON.stringify({ text, projectId: selectedProject?.id ?? null }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Server error ${res.status}`)
        setPhase('input')
        return
      }

      for await (const event of readSSEStream(res)) {
        if (event.name === 'delta') {
          const { text: chunk } = event.data as { text: string }
          setStreamingText(prev => prev + chunk)
        } else if (event.name === 'done') {
          const parsed = event.data as Record<string, unknown>

          const analysisResult: AnalysisResult = {
            ...(parsed as Omit<AnalysisResult, 'sessionId' | 'createdAt'>),
            sessionId: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          }

          const foundation: FoundationData = {
            brd_summary: text.slice(0, 500),
            gap_list: ((parsed.gapList ?? []) as { category: string; description: string; severity: 'high' | 'medium' | 'low' }[]).map((g) => ({
              category: g.category,
              description: g.description,
              severity: g.severity,
            })),
            readiness_score: (parsed.readinessScore as number) ?? 0,
            readiness_label: (parsed.readinessLabel as string) ?? '',
            qa_log: [],
            assumptions: (parsed.assumptions as string[]) ?? [],
            out_of_scope: (parsed.outOfScope as string[]) ?? [],
          }
          setFoundationData(foundation)

          const newSessionState: SessionState = ((parsed.readinessScore as number) ?? 0) >= 80 ? 'ready' : 'refining'
          setSessionState(newSessionState)
          setSectionStates(s => ({ ...s, foundation: 'done' }))

          const firstMsg: ChatMessage = {
            role: 'assistant',
            content: buildFirstAssistantMessage(analysisResult),
          }

          let savedAnalysisId: string | undefined
          if (isAuthenticated) {
            const saveRes = await fetch('/api/save-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: analysisResult.sessionId,
                brdText: text,
                initialAnalysis: analysisResult,
                messages: [firstMsg],
                projectId: selectedProject?.id ?? null,
                sessionState: newSessionState,
                sections: { foundation },
                sectionStates: { ...DEFAULT_SECTION_STATES, foundation: 'done' },
              }),
            })
            if (saveRes.ok) {
              const saved = await saveRes.json().catch(() => ({}))
              savedAnalysisId = saved.analysisId
            } else {
              console.error('[analyze] initial save failed:', await saveRes.text())
            }
          }

          const storedAnalysisResult: AnalysisResult = {
            ...analysisResult,
            id: savedAnalysisId,
          }

          setBrdText(text)
          setResult(storedAnalysisResult)
          setMessages([firstMsg])
          persistAnalysisState(text, [firstMsg], storedAnalysisResult)
          if (!isAuthenticated) setGuestUsage(incrementGuestUsage())
          setPhase('refining')
          return
        } else if (event.name === 'error') {
          const { error: msg } = event.data as { error: string }
          setError(msg)
          setPhase('input')
          return
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
      setPhase('input')
    }
  }

  async function callRefineAPI(
    nextMessages: ChatMessage[],
    currentResult: AnalysisResult,
    currentBrdText: string
  ): Promise<void> {
    setIsRefining(true)
    setError(undefined)

    // Add streaming placeholder before the fetch so the user sees the typing indicator immediately
    const streamingPlaceholder: ChatMessage = { role: 'assistant', content: '', isStreaming: true }
    setMessages([...nextMessages, streamingPlaceholder])

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!isAuthenticated ? { 'x-guest-mode': '1' } : {}),
        },
        body: JSON.stringify({
          brdText: currentBrdText,
          initialAnalysis: currentResult,
          messages: nextMessages,
          qaAnswers,
        }),
      })

      if (!res.ok) {
        // Remove the placeholder and the user message on non-2xx
        setMessages(nextMessages.slice(0, -1))
        setError('Gagal memproses. Coba lagi.')
        return
      }

      let streamedContent = ''

      for await (const event of readSSEStream(res)) {
        if (event.name === 'delta') {
          const { text: chunk } = event.data as { text: string }
          streamedContent += chunk
          setMessages([...nextMessages, { role: 'assistant', content: streamedContent, isStreaming: true }])
        } else if (event.name === 'done') {
          const parsed = event.data as RefineAPIResponse

          const finalMessages: ChatMessage[] = [
            ...nextMessages,
            { role: 'assistant', content: parsed.message, isStreaming: false },
          ]
          setMessages(finalMessages)

          if (parsed.analysis) {
            const updatedResult: AnalysisResult = {
              ...currentResult,
              ...parsed.analysis,
            }
            setResult(updatedResult)

            // Update foundation data from refine response
            if (foundationData) {
              const updatedFoundation: FoundationData = {
                ...foundationData,
                gap_list: (parsed.analysis.gapList ?? foundationData.gap_list).map((g) => ({
                  category: g.category,
                  description: g.description,
                  severity: g.severity,
                })),
                readiness_score: parsed.analysis.readinessScore ?? foundationData.readiness_score,
                readiness_label: parsed.analysis.readinessLabel ?? foundationData.readiness_label,
              }
              setFoundationData(updatedFoundation)
              const newScore = updatedFoundation.readiness_score
              setSessionState(newScore >= 80 ? 'ready' : 'refining')
            }

            setQaAnswers([])
            setResolvedIndices([])
            persistAnalysisState(currentBrdText, finalMessages, updatedResult)
          } else {
            persistAnalysisState(currentBrdText, finalMessages, currentResult)
          }

          incrementRefinementRound()
          const updated = getTempSession()
          if (updated && (updated.refinementRounds >= 3 || updated.hasGenerated)) {
            setShowAccountPrompt(true)
          }
          return
        } else if (event.name === 'error') {
          // Remove the placeholder and the user message on stream error
          setMessages(nextMessages.slice(0, -1))
          setError('Gagal memproses. Coba lagi.')
          return
        }
      }
    } catch (e) {
      setMessages(nextMessages.slice(0, -1))
      setError(e instanceof Error ? e.message : 'Gagal memproses. Coba lagi.')
    } finally {
      setIsRefining(false)
    }
  }

  async function handleSendMessage(text: string) {
    if (!result) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    await callRefineAPI(nextMessages, result, brdText)
  }

  async function handleSubmitQA() {
    if (!result) return

    const newResolved = result.clarificationQuestions
      .map((_, i) => i)
      .filter((i) => {
        const qa = qaAnswers[i]
        return qa && (qa.isOutOfScope || qa.answer.trim().length > 0)
      })
    if (newResolved.length === 0) return

    const submissionText = buildQASubmissionMessage(
      result.clarificationQuestions,
      qaAnswers
    )
    const userMsg: ChatMessage = { role: 'user', content: submissionText }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setResolvedIndices((prev) => Array.from(new Set([...prev, ...newResolved])))

    await callRefineAPI(nextMessages, result, brdText)
  }

  async function handleReanalyze() {
    if (!brdText.trim()) return
    await handleAnalyze(brdText)
  }

  function handleQAAnswerChange(index: number, answer: string) {
    setQaAnswers((prev) => {
      const next = [...prev]
      next[index] = { ...(next[index] ?? { answer: '', isOutOfScope: false }), answer }
      return next
    })
  }

  function handleQAOutOfScopeChange(index: number, checked: boolean) {
    setQaAnswers((prev) => {
      const next = [...prev]
      next[index] = { ...(next[index] ?? { answer: '', isOutOfScope: false }), isOutOfScope: checked }
      return next
    })
  }

  async function handleFinalize() {
    if (!result || isFinalizingRef.current) return
    isFinalizingRef.current = true
    setPhase('finalizing')
    setIsFinalizing(true)
    setError(undefined)

    try {
      if (isAuthenticated) {
        const saveRes = await fetch('/api/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: result.sessionId,
            brdText,
            initialAnalysis: result,
            messages,
            projectId: selectedProject?.id ?? null,
            sessionState: sessionState,
            sections: { foundation: foundationData },
            sectionStates: sectionStates,
          }),
        })
        if (!saveRes.ok) {
          const body = await saveRes.json().catch(() => ({}))
          setError(`Gagal menyimpan sesi: ${body.error ?? saveRes.status}. Coba lagi.`)
          setPhase('refining')
          setIsFinalizing(false)
          isFinalizingRef.current = false
          return
        }
      }
    } catch {
      setError('Gagal menyimpan sesi. Coba lagi.')
      setPhase('refining')
      setIsFinalizing(false)
      isFinalizingRef.current = false
      return
    }

    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!isAuthenticated ? { 'x-guest-mode': '1' } : {}),
        },
        body: JSON.stringify({
          brdText,
          initialAnalysis: result,
          messages,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Gagal membuat requirements. Coba lagi.')
        setPhase('refining')
        return
      }

      const parsed: RequirementsResult = await res.json()
      setRequirements(parsed)
      setPhase('done')
      const currentSession = getTempSession()
      if (currentSession) {
        saveTempSession({ ...currentSession, hasGenerated: true, requirements: parsed })
      }
      setShowAccountPrompt(true)

      if (isAuthenticated) {
        fetch('/api/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: result.sessionId,
            requirements: parsed,
            status: 'done',
            sessionState: 'done',
            sections: { foundation: foundationData },
            sectionStates: sectionStates,
          }),
        }).catch((err) => console.error('[phase-2 save]', err))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat requirements. Coba lagi.')
      setPhase('refining')
    } finally {
      setIsFinalizing(false)
      isFinalizingRef.current = false
    }
  }

  const handleCopySection = useCallback((_section: string, content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const isPostAnalysis = phase === 'refining' || phase === 'finalizing' || phase === 'done'

  // ---- Render ----

  if (phase === 'select-project') {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <SessionSidebar
          isAuthenticated={isAuthenticated}
          onNewSession={handleNewSession}
        />
        <div id="main-content" className="flex flex-col flex-1 min-w-0 h-screen overflow-y-auto">
          <header className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900 hover:text-teal-600 transition-colors text-sm">
              StoryForge<span className="text-teal-500">.id</span>
            </Link>
            <div className="flex items-center gap-3">
              {!isAuthenticated && (
                <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2.5 py-1 border border-gray-200">
                  Guest {guestUsage.count}/{guestUsage.limit}
                </span>
              )}
              {isAuthenticated ? (
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Dashboard</Link>
              ) : (
                <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Masuk</Link>
              )}
            </div>
          </header>
          <div className="max-w-2xl mx-auto px-6 py-10 w-full">
            {showPaywallCTA ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-6 flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-teal-800">Fitur Pro: Company Context</h2>
                  <p className="mt-2 text-sm text-teal-700">
                    Company Context membantu AI menganalisis BRD sesuai konteks bisnis dan teknis proyekmu. Upgrade ke Pro untuk menggunakan fitur ini.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                  >
                    Upgrade ke Pro
                  </Link>
                  <button
                    onClick={() => setShowPaywallCTA(false)}
                    className="text-sm text-teal-600 hover:text-teal-800 transition-colors"
                  >
                    Kembali ke daftar project
                  </button>
                </div>
              </div>
            ) : (
              <ProjectSelector onSelect={handleProjectSelect} />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <SessionSidebar
        isAuthenticated={isAuthenticated}
        onNewSession={handleNewSession}
      />

      <div id="main-content" className="flex flex-col flex-1 min-w-0 h-screen">
        <header className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="font-bold text-gray-900 hover:text-teal-600 transition-colors">
              StoryForge<span className="text-teal-500">.id</span>
            </Link>
            {selectedProject && (
              <>
                <span className="text-gray-300 select-none">/</span>
                <button
                  onClick={() => setPhase('select-project')}
                  className="text-gray-400 text-xs hover:text-gray-700 transition-colors"
                >
                  {selectedProject.name}
                </button>
              </>
            )}
            {isPostAnalysis && result && (
              <>
                <span className="text-gray-300 select-none">/</span>
                <span className="text-gray-400 truncate max-w-[200px] text-xs">
                  {brdText.split('\n')[0].replace(/^#+\s*/, '').slice(0, 50) || 'Analisis BRD'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2.5 py-1 border border-gray-200">
                Guest {guestUsage.count}/{guestUsage.limit}
              </span>
            )}
            {isAuthenticated ? (
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                Masuk
              </Link>
            )}
          </div>
        </header>

        {showAccountPrompt && (
          <div className="flex-shrink-0 bg-teal-600 px-5 py-2.5 text-sm text-white flex items-center justify-between gap-4">
            <span>Simpan hasil analisis — buat akun gratis untuk menyimpan sesi dan melanjutkan kapan saja.</span>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/register"
                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Daftar Gratis
              </Link>
              <button
                onClick={() => setShowAccountPrompt(false)}
                className="text-teal-200 hover:text-white text-xs cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-shrink-0 bg-red-50 border-b border-red-100 px-5 py-2.5 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(undefined)} className="text-red-400 hover:text-red-600 cursor-pointer ml-4 leading-none text-base">×</button>
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {phase === 'input' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8">
                  {isAuthenticated && (
                  <button
                    onClick={() => setPhase('select-project')}
                    className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4 block"
                  >
                    ← {selectedProject?.name ?? 'Pilih project'}
                  </button>
                  )}
                  <h1 className="text-2xl font-extrabold text-gray-900">Analisis BRD</h1>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Paste BRD kamu dan dapatkan gap analysis, readiness score, serta pertanyaan klarifikasi dalam hitungan detik.
                  </p>
                </div>
                <BRDInput
                  value={brdText}
                  onChange={setBrdText}
                  onAnalyze={handleAnalyze}
                  onSample={() => setBrdText(SAMPLE_BRD)}
                  isLoading={false}
                />
              </div>
            </div>
          ) : phase === 'analyzing' ? (
            <AnalyzingState streamingText={streamingText} />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              {/* Living document shown in refining/finalizing/done alongside the chat */}
              {foundationData && (phase === 'refining' || phase === 'finalizing' || phase === 'done') && (
                <div className="flex-shrink-0 border-b border-gray-100 px-6 py-4 bg-gray-50">
                  <LivingDocument
                    foundationData={foundationData}
                    sectionStates={sectionStates}
                    sessionState={sessionState}
                    onCopySection={handleCopySection}
                  />
                </div>
              )}
              <RefinementChat
                messages={messages}
                result={result}
                requirements={requirements}
                qaAnswers={qaAnswers}
                resolvedIndices={resolvedIndices}
                isRefining={isRefining}
                isFinalizing={isFinalizing}
                phase={phase as 'refining' | 'finalizing' | 'done'}
                onSend={handleSendMessage}
                onReanalyze={handleReanalyze}
                onSubmitQA={handleSubmitQA}
                onQAAnswerChange={handleQAAnswerChange}
                onQAOutOfScopeChange={handleQAOutOfScopeChange}
                onGenerate={isPostAnalysis ? handleFinalize : undefined}
                onRequirementsRetry={() => {
                  setPhase('refining')
                  setRequirements(null)
                  setIsFinalizing(false)
                }}
                onRequirementsRegenerate={() => {
                  setRequirements(null)
                  setIsFinalizing(false)
                  isFinalizingRef.current = false
                  handleFinalize()
                }}
                canSubmitFeedback={isAuthenticated && !!result?.id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
