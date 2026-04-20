'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from '@/types'
import { Button } from '@/components/ui/Button'

const MAX_CHARS = 5000
const WARN_CHARS = 4000
const TEXTAREA_MAX_HEIGHT = 200 // px (~8 rows)

interface RefinementChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  readyToFinalize: boolean
  onFinalize: () => void
  isLoading: boolean
  disabled: boolean
}

export function RefinementChat({
  messages,
  onSend,
  readyToFinalize,
  onFinalize,
  isLoading,
  disabled,
}: RefinementChatProps) {
  const [input, setInput] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = input.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= WARN_CHARS && !overLimit
  const canSend = input.trim().length > 0 && !overLimit && !isLoading && !disabled

  // Scroll chat container (not the page) when new messages arrive
  useEffect(() => {
    if (messages.length === 0) return
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-grow textarea up to TEXTAREA_MAX_HEIGHT
  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`
  }

  function handleSend() {
    if (!canSend) return
    onSend(input.trim())
    setInput('')
    // Reset textarea height after clearing
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

  return (
    <div className="flex flex-col gap-4">
      {/* Message thread */}
      <div ref={scrollContainerRef} className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={[
              'max-w-[85%] rounded-xl px-4 py-3 text-sm',
              msg.role === 'assistant'
                ? 'self-start bg-indigo-50 text-gray-800 border border-indigo-100'
                : 'self-end bg-indigo-600 text-white',
            ].join(' ')}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="self-start bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <div className="flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Input area */}
      <div className="flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          rows={3}
          style={{ maxHeight: `${TEXTAREA_MAX_HEIGHT}px`, overflowY: 'auto' }}
          placeholder="Jawab pertanyaan di atas... (Enter untuk kirim, Shift+Enter untuk baris baru)"
          className={[
            'w-full resize-none rounded-lg border px-4 py-3 text-sm',
            'placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1',
            overLimit
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800',
          ].join(' ')}
        />

        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              'text-xs tabular-nums',
              overLimit ? 'text-red-600 font-semibold' : nearLimit ? 'text-yellow-600' : 'text-gray-400',
            ].join(' ')}
          >
            {charCount.toLocaleString('id-ID')} / {MAX_CHARS.toLocaleString('id-ID')}
          </span>

          <div className="flex gap-2">
            <div title={readyToFinalize ? '' : 'Claude belum yakin requirement sudah cukup'}>
              <Button
                variant="secondary"
                onClick={onFinalize}
                disabled={!readyToFinalize || disabled}
                className="text-xs"
              >
                Finalize Requirements
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!canSend}
              loading={isLoading}
            >
              Kirim
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
