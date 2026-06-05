// components/analyze/workspace/ChatPanel.tsx
'use client'
import { useState } from 'react'
import type { ChatMessage } from '@/types'

export function ChatPanel({ messages, isSending, lastResolved, onSend }: {
  messages: ChatMessage[]
  isSending: boolean
  lastResolved: string[]
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0 && !isSending
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'}>
              <div className={m.role === 'user'
                ? 'rounded-2xl bg-teal-600 px-4 py-2 text-sm text-white'
                : 'rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-900'}>
                {m.content}
              </div>
            </div>
          ))}
          {lastResolved.length > 0 && (
            <div className="self-start max-w-[90%] rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
              {lastResolved.map((q, i) => <div key={i}>✓ Menutup pertanyaan: {q}</div>)}
            </div>
          )}
          {isSending && <div className="self-start text-xs text-gray-400">StoryForge sedang berpikir...</div>}
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border border-gray-300 bg-white p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) { onSend(text.trim()); setText('') } } }}
            placeholder="Tulis pesan, jawab pertanyaan, atau minta 'tulis PRD'..."
            rows={1}
            className="flex-1 resize-none bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button
            onClick={() => { if (canSend) { onSend(text.trim()); setText('') } }}
            disabled={!canSend}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  )
}
