'use client'

import { useEffect, useRef, useState } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { GapItem } from './GapItem'
import { QACards } from './QACards'
import { RequirementsPanel } from './RequirementsPanel'
import type { AnalysisResult, ChatMessage, Phase, QAAnswer, RequirementsResult } from '@/types'

const MAX_CHARS = 5000
const WARN_CHARS = 4000

interface RefinementChatProps {
  messages: ChatMessage[]
  result?: AnalysisResult
  requirements?: RequirementsResult | null
  qaAnswers: QAAnswer[]
  resolvedIndices: number[]
  isRefining: boolean
  isFinalizing: boolean
  phase: Phase
  onSend: (text: string) => void
  onReanalyze: () => void
  onSubmitQA: () => void
  onQAAnswerChange: (index: number, answer: string) => void
  onQAOutOfScopeChange: (index: number, checked: boolean) => void
  onGenerate?: () => void
  onRequirementsRetry?: () => void
  onRequirementsRegenerate?: () => void
  canSubmitFeedback?: boolean
}

function getReadinessStyle(score: number) {
  if (score >= 80) return { label: 'Siap Build', cls: 'bg-green-50 text-green-700 border-green-200' }
  if (score >= 50) return { label: 'Perlu Klarifikasi', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' }
  return { label: 'Tidak Siap', cls: 'bg-red-50 text-red-700 border-red-200' }
}

function AIAvatar() {
  return (
    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-1">
      <svg className="w-3.5 h-3.5 text-teal-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
      </svg>
    </div>
  )
}

export function RefinementChat({
  messages,
  result,
  requirements,
  qaAnswers,
  resolvedIndices,
  isRefining,
  isFinalizing,
  phase,
  onSend,
  onReanalyze,
  onSubmitQA,
  onQAAnswerChange,
  onQAOutOfScopeChange,
  onGenerate,
  onRequirementsRetry,
  onRequirementsRegenerate,
  canSubmitFeedback = false,
}: RefinementChatProps) {
  const [input, setInput] = useState('')
  const [qaVersion, setQaVersion] = useState(0)
  const [generateConfirm, setGenerateConfirm] = useState<'answers' | 'score' | null>(null)
  const pendingGenerateRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= WARN_CHARS && !overLimit
  const isInputDisabled = phase === 'finalizing' || phase === 'done'
  const canSend = input.trim().length > 0 && !overLimit && !isRefining && !isInputDisabled

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, requirements, isRefining])

  useEffect(() => {
    if (result?.clarificationQuestions) {
      setQaVersion(v => v + 1)
    }
  }, [result?.clarificationQuestions])

  // After submit-then-generate: fire generate once refining completes
  useEffect(() => {
    if (!isRefining && pendingGenerateRef.current) {
      pendingGenerateRef.current = false
      onGenerate?.()
    }
  }, [isRefining, onGenerate])

  function handleSend() {
    if (!canSend) return
    onSend(input.trim())
    setInput('')
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const resolvedSet = new Set(resolvedIndices)
  const hasUnanswered = result?.clarificationQuestions.some((_, i) => !resolvedSet.has(i)) ?? false
  const isReadyToGenerate = (result?.readinessScore ?? 0) >= 80
  const hasBlockingGaps = result?.gapList.some(g => g.severity === 'high' || g.severity === 'medium') ?? false
  const canGenerate = isReadyToGenerate || !hasBlockingGaps
  const hasUnsubmittedAnswers = result?.clarificationQuestions.some((_, i) => {
    const qa = qaAnswers[i]
    return qa && (qa.answer.trim().length > 0 || qa.isOutOfScope) && !resolvedSet.has(i)
  }) ?? false
  const readinessStyle = result ? getReadinessStyle(result.readinessScore) : null

  return (
    <div className="flex flex-1 min-h-0 min-w-0">

      {/* ── Middle: Chat ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">

        {/* Scrollable messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-4">

            {/* Message thread */}
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={[
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  ].join(' ')}
                >
                  {msg.role === 'assistant' && <AIAvatar />}
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-800',
                    ].join(' ')}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isRefining && (
                <div className="flex gap-2 justify-start">
                  <AIAvatar />
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User stories */}
            {requirements != null && (
              <CollapsibleSection
                title="User Stories"
                count={requirements.userStories?.length}
                defaultOpen={true}
              >
                <RequirementsPanel
                  requirements={requirements}
                  isLoading={false}
                  onRetry={onRequirementsRetry}
                  onRegenerate={onRequirementsRegenerate}
                />
              </CollapsibleSection>
            )}

            <div className="h-2" />
          </div>
        </div>

        {/* Input bar */}
        {phase !== 'done' && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4">
            <div className="max-w-2xl mx-auto flex gap-3 items-end">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); adjustHeight() }}
                  onKeyDown={handleKeyDown}
                  disabled={isInputDisabled || isRefining}
                  rows={1}
                  placeholder="Tambah konteks, jawab pertanyaan, atau iterasi... (Enter kirim · Shift+Enter baris baru)"
                  className={[
                    'w-full resize-none rounded-xl border px-4 py-3 text-sm max-h-48 overflow-y-auto',
                    'placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors',
                    overLimit
                      ? 'border-red-300 focus:border-red-400 focus:ring-red-300'
                      : 'border-gray-200 focus:border-teal-400 focus:ring-teal-300',
                    isInputDisabled || isRefining
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-800',
                  ].join(' ')}
                />
                {(nearLimit || overLimit) && (
                  <p className={`mt-1 text-xs ${overLimit ? 'text-red-500' : 'text-yellow-600'}`}>
                    {charCount.toLocaleString('id-ID')} / {MAX_CHARS.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!canSend}
                aria-label="Kirim pesan"
                className="rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Kirim
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Analysis panel ────────────────────────── */}
      {result && (
        <div className="hidden lg:flex flex-col w-80 flex-shrink-0 border-l border-gray-200 bg-gray-50 min-h-0">

          {/* Scrollable analysis content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {/* Readiness badge */}
            <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-3 ${readinessStyle?.cls}`}>
              <span className="text-xl font-black tabular-nums leading-none">{result.readinessScore}</span>
              <span className="text-xs opacity-60">/100</span>
              <span className="opacity-25 mx-0.5">·</span>
              <span className="text-sm font-semibold">{readinessStyle?.label}</span>
            </div>

            {/* Gap Analysis */}
            {result.gapList.length > 0 && (
              <CollapsibleSection title="Gap Analysis" count={result.gapList.length}>
                <ul className="flex flex-col gap-2">
                  {result.gapList.map((gap, idx) => (
                    <GapItem
                      key={idx}
                      gap={gap}
                      index={idx}
                      analysisId={result.id}
                      canSubmitFeedback={canSubmitFeedback}
                    />
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Pertanyaan Klarifikasi */}
            {result.clarificationQuestions.length > 0 && (
              <CollapsibleSection
                key={qaVersion}
                title="Pertanyaan Klarifikasi"
                count={result.clarificationQuestions.length}
                defaultOpen={hasUnanswered}
              >
                <QACards
                  questions={result.clarificationQuestions}
                  qaAnswers={qaAnswers}
                  resolvedIndices={resolvedIndices}
                  isLoading={isRefining}
                  onAnswerChange={onQAAnswerChange}
                  onOutOfScopeChange={onQAOutOfScopeChange}
                  onSubmit={onSubmitQA}
                />
              </CollapsibleSection>
            )}
          </div>

          {/* Generate button pinned at bottom */}
          {onGenerate && phase === 'refining' && (
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">

              {/* Confirmation: unsubmitted answers */}
              {generateConfirm === 'answers' && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Ada jawaban yang belum disubmit</p>
                  <p className="text-xs text-amber-700">Submit jawaban dulu agar AI bisa memperbarui analisis, atau langsung generate sekarang.</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setGenerateConfirm(null)
                        pendingGenerateRef.current = true
                        onSubmitQA()
                      }}
                      className="flex-1 rounded-lg bg-teal-600 text-white py-1.5 text-xs font-semibold hover:bg-teal-700 cursor-pointer transition-colors"
                    >
                      Submit & Generate
                    </button>
                    <button
                      onClick={() => { setGenerateConfirm(null); onGenerate() }}
                      className="flex-1 rounded-lg border border-gray-200 text-gray-600 py-1.5 text-xs font-medium hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Generate langsung
                    </button>
                  </div>
                  <button
                    onClick={() => setGenerateConfirm(null)}
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer pt-0.5"
                  >
                    Batal
                  </button>
                </div>
              )}

              {/* Confirmation: low readiness */}
              {generateConfirm === 'score' && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Readiness {result?.readinessScore}/100</p>
                  <p className="text-xs text-amber-700">BRD masih memiliki gap. Lanjut generate user stories sekarang?</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setGenerateConfirm(null); onGenerate() }}
                      className="flex-1 rounded-lg bg-amber-500 text-white py-1.5 text-xs font-semibold hover:bg-amber-600 cursor-pointer transition-colors"
                    >
                      Ya, generate
                    </button>
                    <button
                      onClick={() => setGenerateConfirm(null)}
                      className="flex-1 rounded-lg border border-gray-200 text-gray-600 py-1.5 text-xs font-medium hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Main button */}
              {generateConfirm === null && (
                <button
                  onClick={() => {
                    if (hasUnsubmittedAnswers) {
                      setGenerateConfirm('answers')
                    } else if (!isReadyToGenerate && canGenerate) {
                      setGenerateConfirm('score')
                    } else {
                      onGenerate()
                    }
                  }}
                  disabled={!canGenerate || isFinalizing}
                  className={[
                    'w-full rounded-xl py-2.5 text-sm font-bold transition-colors cursor-pointer',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isReadyToGenerate
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : canGenerate
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-gray-200 text-gray-400',
                  ].join(' ')}
                >
                  {isFinalizing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Membuat User Stories...
                    </span>
                  ) : (
                    'Generate User Stories'
                  )}
                </button>
              )}

              {generateConfirm === null && !canGenerate && !isFinalizing && (
                <p className="mt-1.5 text-center text-xs text-red-500">Selesaikan gap high/medium dulu</p>
              )}
              {generateConfirm === null && canGenerate && !isReadyToGenerate && !isFinalizing && (
                <p className="mt-1.5 text-center text-xs text-amber-600">Readiness {result?.readinessScore}/100 — hanya low gaps tersisa</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
