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

      if (!res.ok || !res.body) {
        setError(`Server error ${res.status}`)
        setPhase('input')
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
      const parsed = JSON.parse(cleaned)
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

      if (!res.ok || !res.body) {
        setMessages(messages) // rollback user message
        setError('Gagal mengirim pesan. Coba lagi.')
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
      const parsed: { message: string; readyToFinalize: boolean } = JSON.parse(cleaned)

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

      if (!res.ok || !res.body) {
        setError('Gagal membuat requirements. Coba lagi.')
        setPhase('refining')
        // isFinalizing is reset in the finally block below
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
      const parsed: RequirementsResult = JSON.parse(cleaned)
      setRequirements(parsed)
      setPhase('done')

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
                {/* BRD summary */}
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">BRD yang dianalisis</span>
                  <span className="text-xs font-medium text-gray-600">
                    {summarizeBrd(brdText)}
                  </span>
                </div>

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
            />
          )}
        </div>
      </main>
    </div>
  )
}
