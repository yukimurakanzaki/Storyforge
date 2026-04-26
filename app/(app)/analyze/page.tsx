'use client'

import { useEffect, useRef, useState } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import { RefinementChat } from '@/components/analyze/RefinementChat'
import { QACards } from '@/components/analyze/QACards'
import { RequirementsPanel } from '@/components/analyze/RequirementsPanel'
import { SAMPLE_BRD } from '@/lib/constants'
import type {
  AnalysisResult,
  ChatMessage,
  Phase,
  QAAnswer,
  RequirementsResult,
} from '@/types'
import Link from 'next/link'
import {
  initTempSession,
  saveTempSession,
  incrementRefinementRound,
  getTempSession,
  persistAnalysisState,
} from '@/lib/session/temp-session'
import { useMigrateTempSession } from '@/lib/session/use-migrate-temp-session'
import { createClient } from '@/lib/supabase/client'

interface RefineAPIResponse {
  message: string
  readyToFinalize: boolean
  analysis: Omit<AnalysisResult, 'sessionId' | 'createdAt'> | null
}

function summarizeBrd(text: string): string {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const paragraphs = text.trim().split(/\n\n+/).filter(Boolean).length
  return `${paragraphs} paragraf · ${words.toLocaleString('id-ID')} kata`
}

function buildFirstAssistantMessage(analysis: AnalysisResult): string {
  if (analysis.clarificationQuestions.length === 0) {
    return 'Analisis BRD selesai. Readiness score cukup tinggi. Klik "Generate User Stories" di panel kanan jika kamu sudah siap.'
  }
  const numbered = analysis.clarificationQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')
  return `Berdasarkan analisis BRD kamu, ada beberapa hal yang perlu klarifikasi:\n\n${numbered}\n\nJawab melalui kartu Q&A di bawah atau ketik langsung di chat.`
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
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [requirements, setRequirements] = useState<RequirementsResult | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showBrdEdit, setShowBrdEdit] = useState(false)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [qaAnswers, setQaAnswers] = useState<QAAnswer[]>([])
  const [resolvedIndices, setResolvedIndices] = useState<number[]>([])
  const isFinalizingRef = useRef(false)

  useMigrateTempSession(isAuthenticated)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user)
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

  async function handleAnalyze(text: string) {
    setPhase('analyzing')
    setResult(undefined)
    setError(undefined)
    setMessages([])
    setQaAnswers([])
    setResolvedIndices([])
    setRequirements(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Server error ${res.status}`)
        setPhase('input')
        return
      }

      const parsed = await res.json()
      const analysisResult: AnalysisResult = {
        ...parsed,
        sessionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }

      const firstMsg: ChatMessage = {
        role: 'assistant',
        content: buildFirstAssistantMessage(analysisResult),
      }

      setBrdText(text)
      setResult(analysisResult)
      setMessages([firstMsg])
      setPhase('refining')
      persistAnalysisState(text, [firstMsg], analysisResult)
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

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const parsed: RefineAPIResponse = await res.json()

      const updatedMessages: ChatMessage[] = [
        ...nextMessages,
        { role: 'assistant', content: parsed.message },
      ]
      setMessages(updatedMessages)

      if (parsed.analysis) {
        const updatedResult: AnalysisResult = {
          ...currentResult,
          ...parsed.analysis,
        }
        setResult(updatedResult)
        persistAnalysisState(currentBrdText, updatedMessages, updatedResult)
      } else {
        persistAnalysisState(currentBrdText, updatedMessages, currentResult)
      }

      incrementRefinementRound()
      const updated = getTempSession()
      if (updated && (updated.refinementRounds >= 3 || updated.hasGenerated)) {
        setShowAccountPrompt(true)
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
      const saveRes = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          brdText,
          initialAnalysis: result,
          messages,
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
        headers: { 'Content-Type': 'application/json' },
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

      fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          requirements: parsed,
          status: 'done',
        }),
      }).catch((err) => console.error('[phase-2 save]', err))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat requirements. Coba lagi.')
      setPhase('refining')
    } finally {
      setIsFinalizing(false)
      isFinalizingRef.current = false
    }
  }

  const isPostAnalysis = phase === 'refining' || phase === 'finalizing' || phase === 'done'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-gray-800 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {showAccountPrompt && (
        <div className="bg-indigo-600 px-4 py-3 text-sm text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <span>
              Simpan hasil analisis ini — buat akun gratis untuk menyimpan sesi dan mulai analisis baru kapan saja.
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/register"
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                Daftar Gratis
              </Link>
              <button
                onClick={() => setShowAccountPrompt(false)}
                className="text-indigo-200 hover:text-white text-xs"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analisis BRD</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isPostAnalysis
              ? 'Jawab pertanyaan klarifikasi atau chat langsung. Generate user stories saat BRD sudah cukup jelas.'
              : 'Paste BRD kamu di bawah dan klik Analyze untuk mendapatkan laporan kesiapan.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left col */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            {!isPostAnalysis ? (
              <BRDInput
                value={brdText}
                onChange={setBrdText}
                onAnalyze={handleAnalyze}
                onSample={() => setBrdText(SAMPLE_BRD)}
                isLoading={phase === 'analyzing'}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {/* BRD summary + edit toggle */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">BRD yang dianalisis</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600">
                      {summarizeBrd(brdText)}
                    </span>
                    <button
                      onClick={() => setShowBrdEdit((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      title={showBrdEdit ? 'Sembunyikan teks BRD' : 'Edit teks BRD'}
                    >
                      <span
                        className={[
                          'inline-flex w-8 h-4 rounded-full transition-colors duration-200 relative',
                          showBrdEdit ? 'bg-indigo-600' : 'bg-gray-300',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block w-3 h-3 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200',
                            showBrdEdit ? 'translate-x-4' : 'translate-x-0.5',
                          ].join(' ')}
                        />
                      </span>
                      Edit BRD
                    </button>
                  </div>
                </div>

                {/* Collapsible BRD edit */}
                {showBrdEdit && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={brdText}
                      onChange={(e) => setBrdText(e.target.value)}
                      rows={8}
                      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-400">Edit BRD lalu klik &ldquo;Analisis Ulang&rdquo; di bawah untuk memperbarui gap analysis.</p>
                  </div>
                )}

                {/* Q&A Cards */}
                {result && result.clarificationQuestions.length > 0 && (
                  <QACards
                    questions={result.clarificationQuestions}
                    qaAnswers={qaAnswers}
                    resolvedIndices={resolvedIndices}
                    isLoading={isRefining}
                    onAnswerChange={handleQAAnswerChange}
                    onOutOfScopeChange={handleQAOutOfScopeChange}
                    onSubmit={handleSubmitQA}
                  />
                )}

                <RefinementChat
                  messages={messages}
                  onSend={handleSendMessage}
                  onReanalyze={handleReanalyze}
                  isLoading={isRefining}
                  disabled={phase === 'finalizing' || phase === 'done'}
                />
              </div>
            )}
          </div>

          {/* Right col */}
          {phase === 'done' ? (
            <RequirementsPanel
              requirements={requirements}
              isLoading={isFinalizing}
              onRetry={() => {
                setPhase('refining')
                setRequirements(null)
                setIsFinalizing(false)
              }}
            />
          ) : (
            <OutputPanel
              result={result}
              isLoading={phase === 'analyzing'}
              onGenerate={isPostAnalysis ? handleFinalize : undefined}
              isGenerating={isFinalizing}
            />
          )}
        </div>
      </main>
    </div>
  )
}
