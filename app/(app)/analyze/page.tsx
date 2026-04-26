'use client'

import { useEffect, useState } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import { RefinementChat } from '@/components/analyze/RefinementChat'
import { RequirementsPanel } from '@/components/analyze/RequirementsPanel'
import { SAMPLE_BRD } from '@/lib/constants'
import {
  AnalysisResult,
  ChatMessage,
  Phase,
  RequirementsResult,
} from '@/types'
import Link from 'next/link'
import { initTempSession, saveTempSession, incrementRefinementRound, getTempSession } from '@/lib/session/temp-session'
import type { TempSession } from '@/types'
import { useMigrateTempSession } from '@/lib/session/use-migrate-temp-session'

function summarizeBrd(text: string): string {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const paragraphs = text.trim().split(/\n\n+/).filter(Boolean).length
  return `${paragraphs} paragraf · ${words.toLocaleString('id-ID')} kata`
}

function buildFirstAssistantMessage(analysis: AnalysisResult): string {
  if (analysis.clarificationQuestions.length === 0) {
    return 'Analisis BRD selesai. Readiness score cukup tinggi. Klik "Finalize Requirements" jika kamu sudah siap.'
  }
  const numbered = analysis.clarificationQuestions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')
  return `Berdasarkan analisis BRD kamu, ada beberapa hal yang perlu klarifikasi:\n\n${numbered}`
}

export default function AnalyzePage() {
  const [brdText, setBrdText] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [readyToFinalize, setReadyToFinalize] = useState(false)
  const [requirements, setRequirements] = useState<RequirementsResult | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [tempSession, setTempSession] = useState<TempSession | null>(null)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false)

  useMigrateTempSession(false)

  // Warn user before leaving mid-session
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
    setTempSession(session)
    if (session.refinementRounds >= 3 || session.hasGenerated) {
      setShowAccountPrompt(true)
    }
  }, [])

  async function handleAnalyze(text: string) {
    setPhase('analyzing')
    setResult(undefined)
    setError(undefined)
    setMessages([])
    setReadyToFinalize(false)
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

      setBrdText(text)  // ensure state matches what was analyzed
      setResult(analysisResult)
      setMessages([
        {
          role: 'assistant',
          content: buildFirstAssistantMessage(analysisResult),
        },
      ])
      // If readiness is already high, pre-signal finalize readiness
      if (analysisResult.readinessScore >= 80) {
        setReadyToFinalize(true)
      }
      setPhase('refining')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
      setPhase('input')
    }
  }

  async function handleSendMessage(text: string) {
    if (!result) return
    setIsRefining(true)
    setError(undefined)

    const userMessage: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brdText,
          initialAnalysis: result,
          messages: nextMessages,
        }),
      })

      if (!res.ok) {
        setMessages(messages) // rollback user message
        setError('Gagal mengirim pesan. Coba lagi.')
        return
      }

      if (!res.body) {
        setMessages(messages) // rollback user message
        setError('Respons streaming kosong. Coba lagi.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()

      let parsed: { message: string; readyToFinalize: boolean }
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        // JSON truncated — extract what we can
        const msgMatch = cleaned.match(/"message"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"readyToFinalize|"\s*\}|$)/)
        const rtfMatch = cleaned.match(/"readyToFinalize"\s*:\s*(true|false)/)
        const rawMessage = msgMatch
          ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
          : cleaned
        parsed = {
          message: rawMessage || 'Maaf, terjadi kesalahan memproses respons.',
          readyToFinalize: rtfMatch?.[1] === 'true',
        }
      }

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: parsed.message },
      ])
      if (parsed.readyToFinalize) {
        setReadyToFinalize(true)
      }
    } catch (e) {
      setMessages(messages) // rollback user message
      setError(e instanceof Error ? e.message : 'Gagal mengirim pesan. Coba lagi.')
    } finally {
      setIsRefining(false)
      incrementRefinementRound()
      const updated = getTempSession()
      if (updated && updated.refinementRounds >= 3) {
        setShowAccountPrompt(true)
      }
    }
  }

  async function handleFinalize() {
    if (!result) return
    if (isFinalizing || phase === 'finalizing' || phase === 'done') return
    setPhase('finalizing')
    setIsFinalizing(true)
    setError(undefined)

    // Phase 1 save — persist conversation before generating requirements
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
        return
      }
    } catch {
      setError('Gagal menyimpan sesi. Coba lagi.')
      setPhase('refining')
      setIsFinalizing(false)
      return
    }

    // Generate requirements
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

      // Phase 2 save — fire and forget
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
    }
  }

  const isRefiningPhase = phase === 'refining' || phase === 'finalizing' || phase === 'done'

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
            {isRefiningPhase
              ? 'Jawab pertanyaan klarifikasi, lalu klik Finalize untuk generate requirements.'
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
            {!isRefiningPhase ? (
              <BRDInput
                value={brdText}
                onChange={setBrdText}
                onAnalyze={handleAnalyze}
                onSample={() => setBrdText(SAMPLE_BRD)}
                isLoading={phase === 'analyzing'}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {/* BRD summary + analysis toggle */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">BRD yang dianalisis</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600">
                      {summarizeBrd(brdText)}
                    </span>
                    <button
                      onClick={() => setShowAnalysis((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      title={showAnalysis ? 'Sembunyikan analisis' : 'Lihat hasil analisis'}
                    >
                      <span
                        className={[
                          'inline-flex w-8 h-4 rounded-full transition-colors duration-200 relative',
                          showAnalysis ? 'bg-indigo-600' : 'bg-gray-300',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block w-3 h-3 bg-white rounded-full shadow absolute top-0.5 transition-transform duration-200',
                            showAnalysis ? 'translate-x-4' : 'translate-x-0.5',
                          ].join(' ')}
                        />
                      </span>
                      Analisis
                    </button>
                  </div>
                </div>

                {/* Collapsible inline analysis */}
                {showAnalysis && result && (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 max-h-60 overflow-y-auto text-xs text-gray-700 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-700">Hasil Analisis Awal</span>
                      <span className="text-indigo-600 font-medium">
                        Readiness: {result.readinessScore}/100 · {result.readinessLabel}
                      </span>
                    </div>
                    {result.clarificationQuestions.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 mb-1">Pertanyaan Klarifikasi:</p>
                        <ol className="flex flex-col gap-1 list-decimal list-inside">
                          {result.clarificationQuestions.map((q, i) => (
                            <li key={i} className="leading-relaxed">{q}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {result.gapList.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 mb-1">Gap yang Ditemukan:</p>
                        <ul className="flex flex-col gap-1">
                          {result.gapList.map((g, i) => (
                            <li key={i} className="flex gap-1.5">
                              <span className={[
                                'font-semibold shrink-0',
                                g.severity === 'high' ? 'text-red-600' : g.severity === 'medium' ? 'text-yellow-600' : 'text-gray-500',
                              ].join(' ')}>
                                [{g.severity.toUpperCase()}]
                              </span>
                              <span>{g.category}: {g.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <RefinementChat
                  messages={messages}
                  onSend={handleSendMessage}
                  readyToFinalize={readyToFinalize}
                  onFinalize={handleFinalize}
                  isLoading={isRefining}
                  disabled={phase === 'finalizing' || phase === 'done'}
                />
              </div>
            )}
          </div>

          {/* Right col */}
          {phase === 'input' || phase === 'analyzing' ? (
            <OutputPanel result={result} isLoading={phase === 'analyzing'} />
          ) : phase === 'refining' ? (
            <OutputPanel result={result} isLoading={false} />
          ) : (
            <RequirementsPanel
              requirements={requirements}
              isLoading={isFinalizing}
              onRetry={() => {
                setPhase('refining')
                setRequirements(null)
                setIsFinalizing(false)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
