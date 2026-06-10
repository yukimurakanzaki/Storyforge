// components/analyze/workspace/EmptyState.tsx
'use client'
import { useState } from 'react'

export function EmptyState({ onSend, isSending }: { onSend: (text: string) => void; isSending: boolean }) {
  const [text, setText] = useState('')
  const canSend = text.trim().length > 0 && !isSending
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-gray-900">Mulai analisis requirement</h1>
      <p className="mt-2 text-center text-sm text-gray-500">
        Tempel BRD atau tulis requirement-mu. StoryForge akan menemukan gap, menanyakan yang belum jelas, dan menulis PRD-nya bersamamu.
      </p>
      <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tempel BRD atau tulis requirement di sini..."
          rows={5}
          className="w-full resize-none bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        <div className="flex justify-end pt-2">
          <button
            onClick={() => { if (canSend) { onSend(text.trim()); setText('') } }}
            disabled={!canSend}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
          >
            {isSending ? 'Menganalisis...' : 'Analisis'}
          </button>
        </div>
      </div>
    </div>
  )
}
