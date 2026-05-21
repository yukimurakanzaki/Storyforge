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
import { UsageCounter } from '@/components/analyze/UsageCounter'
import { UpgradeCTA } from '@/components/analyze/UpgradeCTA'
import { TierBadge } from '@/components/ui/TierBadge'
import { createClient } from '@/lib/supabase/client'
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
  const [phase, setPhase] = useState<AppPhase>('input')
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
  const [qaAnswers, setQaAnswers] = useState<QAAnswer[]>([])
  const [resolvedIndices, setResolvedIndices] = useState<number[]>([])
  const [foundationData, setFoundationData] = useState<FoundationData | null>(null)
  const [sectionStates, setSectionStates] = useState<SectionStates>(DEFAULT_SECTION_STATES)
  const [sessionState, setSessionState] = useState<SessionState>('refining')
  const [usageData, setUsageData] = useState<{ used: number; limit: number } | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [showUpgradeCTA, setShowUpgradeCTA] = useState(false)
  const [companyContextError, setCompanyContextError] = useState<string | null>(null)
  const isFinalizingRef = useRef(false)

  // Fetch user plan and usage data server-side on page load
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setIsAuthenticated(!!user)
      if (user) {
        // Fetch plan from subscriptions
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        const plan = (sub?.plan as 'free' | 'pro') ?? 'free'
        setUserPlan(plan)

        // Free tier: go directly to BRD input (no project selector)
        if (plan === 'free') {
          setPhase('input')
        } else {
          // Pro tier: show project selector first
          setPhase('select-project')
        }

        // Fetch usage data from server
        try {
          const usageRes = await fetch('/api/usage')
          if (usageRes.ok) {
            const data = await usageRes.json()
            setUsageData({ used: data.used, limit: data.limit })
          } else {
            setUsageError(true)
          }
        } catch {
          setUsageError(true)
        }
      } else {
        // Not authenticated — middleware handles redirect, but as fallback show input
        setPhase('input')
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
      if (!session?.user) {
        setUserPlan(null)
        setPhase('input')
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
    if (!result) return
    setQaAnswers((prev) => {
      const next = [...prev]
      while (next.length < result.clarificationQuestions.length) {
        next.push({ answer: '', isOutOfScope: false })
      }
      return next
    })
  }, [result])

  async function handleProjectSelectWithContextLoad(project: Project) {
    setSelectedProject(project)
    setCompanyContextError(null)

    // Pro tier: verify Company Context is available on project selection
    // The project object already contains context from the ProjectSelector fetch.
    // If context is missing/empty, we attempt a fresh fetch to confirm.
    const hasContext = project.context &&
      project.context.business &&
      (project.context.business.domain || project.context.business.description)

    if (hasContext) {
      // Company Context loaded successfully — proceed to BRD input
      setPhase('input')
      return
    }

    // Attempt to reload project data to verify context availability
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) {
        setCompanyContextError('Gagal memuat Company Context. Coba lagi.')
        return
      }
      const { projects } = await res.json()
      const freshProject = (projects as Project[]).find(p => p.id === project.id)
      if (freshProject) {
        setSelectedProject(freshProject)
      }
      // Proceed to input even if context is empty — the project was selected
      setPhase('input')
    } catch {
      setCompanyContextError('Gagal memuat Company Context. Coba lagi.')
    }
  }

  function handleRetryCompanyContext() {
    if (selectedProject) {
      handleProjectSelectWithContextLoad(selectedProject)
    }
  }

  function handleNewSession() {
    setBrdText('')
    if (userPlan === 'pro') {
      setPhase('select-project')
    } else {
      setPhase('input')
    }
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
    setCompanyContextError(null)
    isFinalizingRef.current = false
  }

  async function handleAnalyze(text: string) {
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
          setPhase('refining')

          // Refresh usage data after successful analysis
          if (usageData) {
            setUsageData({ used: usageData.used + 1, limit: usageData.limit })
          }
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

    const streamingPlaceholder: ChatMessage = { role: 'assistant', content: '', isStreaming: true }
    setMessages([...nextMessages, streamingPlaceholder])

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brdText: currentBrdText,
          initialAnalysis: currentResult,
          messages: nextMessages,
          qaAnswers,
        }),
      })

      if (!res.ok) {
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
          }

          return
        } else if (event.name === 'error') {
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

  const handleUsageCounterClick = useCallback(() => {
    if (userPlan === 'free') {
      setShowUpgradeCTA(true)
    }
  }, [userPlan])

  const isPostAnalysis = phase === 'refining' || phase === 'finalizing' || phase === 'done'

  // Usage limit handling for free-tier users
  const isFreeTier = userPlan === 'free'
  const usageLimitReached = isFreeTier && usageData !== null && usageData.used >= usageData.limit
  const usageSoftLimit = isFreeTier && usageData !== null && usageData.used > usageData.limit && usageData.used <= usageData.limit * 2
  const usageHardBlock = isFreeTier && usageData !== null && usageData.used > usageData.limit * 2

  // ---- Render ----

  // Pro tier: project selector phase
  if (phase === 'select-project' && userPlan === 'pro') {
    return (
      <div className="flex h-screen overflow-hidden bg-white">
        <SessionSidebar
          isAuthenticated={isAuthenticated}
          onNewSession={handleNewSession}
        />
        <div id="main-content" className="flex flex-col flex-1 min-w-0 h-screen overflow-y-auto">
          <header className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="font-bold text-gray-900 hover:text-teal-600 transition-colors text-sm">
                StoryForge<span className="text-teal-500">.id</span>
              </Link>
              {userPlan && <TierBadge plan={userPlan} />}
            </div>
            <div className="flex items-center gap-3">
              {usageData && userPlan && (
                <UsageCounter
                  used={usageData.used}
                  limit={usageData.limit}
                  plan={userPlan}
                  onClick={handleUsageCounterClick}
                  error={usageError}
                />
              )}
              {usageError && !usageData && (
                <UsageCounter used={0} limit={0} plan={userPlan ?? 'free'} error={true} />
              )}
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Dashboard</Link>
            </div>
          </header>
          <div className="max-w-2xl mx-auto px-6 py-10 w-full">
            {companyContextError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-red-800">Gagal Memuat Company Context</h2>
                  <p className="mt-2 text-sm text-red-700">{companyContextError}</p>
                </div>
                <button
                  onClick={handleRetryCompanyContext}
                  className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors self-start"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <ProjectSelector onSelect={handleProjectSelectWithContextLoad} />
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
            {userPlan && <TierBadge plan={userPlan} />}
            {selectedProject && userPlan === 'pro' && (
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
            {/* UsageCounter in page header */}
            {usageData && userPlan && (
              <UsageCounter
                used={usageData.used}
                limit={usageData.limit}
                plan={userPlan}
                onClick={handleUsageCounterClick}
                error={usageError}
              />
            )}
            {usageError && !usageData && (
              <UsageCounter used={0} limit={0} plan={userPlan ?? 'free'} error={true} />
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

        {/* Upgrade CTA: triggered by UsageCounter click or usage limit reached */}
        {showUpgradeCTA && userPlan === 'free' && !usageLimitReached && !usageSoftLimit && !usageHardBlock && (
          <div className="flex-shrink-0 px-5 py-3">
            <UpgradeCTA message="Upgrade ke Pro untuk mendapatkan 50 analisis/bulan dan fitur Company Context." />
          </div>
        )}

        {/* Inline UpgradeCTA when free-tier user has used all 3 monthly analyses (used >= limit, used <= limit*2) */}
        {usageLimitReached && !usageSoftLimit && !usageHardBlock && phase === 'input' && (
          <div className="flex-shrink-0 px-5 py-3">
            <UpgradeCTA message="Kamu sudah menggunakan semua 3 analisis gratis bulan ini. Upgrade ke Pro untuk melanjutkan dengan 50 analisis/bulan." />
          </div>
        )}

        {/* Prominent inline UpgradeCTA for 4-6 analyses (soft limit: used > limit, used <= limit*2) — no blocking */}
        {usageSoftLimit && phase === 'input' && (
          <div className="flex-shrink-0 px-5 py-3">
            <UpgradeCTA message="Kamu sudah melewati batas analisis gratis. Upgrade ke Pro sekarang untuk akses penuh dengan 50 analisis/bulan dan fitur Company Context." />
          </div>
        )}

        {/* Full-screen blocking wall when usage exceeds 2x limit (>6 analyses) */}
        {usageHardBlock && phase === 'input' && (
          <UpgradeCTA
            variant="blocking"
            message="Kamu sudah jauh melewati batas analisis gratis. Upgrade ke Pro untuk melanjutkan analisis BRD."
          />
        )}

        <div className="flex flex-col flex-1 min-h-0">
          {phase === 'input' ? (
            <div className="flex-1 overflow-y-auto">
              {/* Only show BRD input form if not hard-blocked */}
              {!usageHardBlock ? (
              <div className="max-w-3xl mx-auto px-6 py-10">
                <div className="mb-8">
                  {userPlan === 'pro' && (
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
              ) : (
              <div className="max-w-3xl mx-auto px-6 py-10 text-center">
                <p className="text-gray-500 text-sm">Analisis BRD tidak tersedia. Silakan upgrade ke Pro untuk melanjutkan.</p>
              </div>
              )}
            </div>
          ) : phase === 'analyzing' ? (
            <AnalyzingState streamingText={streamingText} />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
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
                plan={userPlan}
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
