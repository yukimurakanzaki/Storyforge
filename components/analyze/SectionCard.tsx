'use client'
import { useState, useEffect } from 'react'
import { SectionStatus } from '@/types'

type Props = {
  title: string
  icon: string
  badges: string[]
  status: SectionStatus
  onGenerate?: () => void
  onCopy?: () => void
  children?: React.ReactNode
  disabled?: boolean
}

const STATUS_STYLES: Record<SectionStatus, string> = {
  empty: 'bg-slate-800 text-slate-500',
  generating: 'bg-amber-900/40 text-amber-400',
  done: 'bg-teal-900/40 text-teal-400',
  stale: 'bg-orange-900/40 text-orange-400',
}

const STATUS_LABELS: Record<SectionStatus, string> = {
  empty: 'Belum dibuat',
  generating: 'Memproses...',
  done: 'Selesai',
  stale: 'Perlu diperbarui',
}

export function SectionCard({
  title, icon, badges, status, onGenerate, onCopy, children, disabled
}: Props) {
  const [open, setOpen] = useState(status === 'done' || status === 'stale')

  useEffect(() => {
    if (status === 'done' || status === 'stale') setOpen(true)
  }, [status])

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={`section-body-${title}`}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <span className="text-lg flex-shrink-0">{icon}</span>
          <span className="font-semibold text-slate-100 text-sm truncate">{title}</span>
          <div className="flex gap-1 flex-shrink-0">
            {badges.map(b => (
              <span key={b} className="text-xs bg-slate-800 text-slate-400 rounded px-2 py-0.5">
                {b}
              </span>
            ))}
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>

          {status === 'done' && onCopy && (
            <button
              aria-label={`Salin ${title}`}
              onClick={onCopy}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Salin
            </button>
          )}

          {(status === 'empty' || status === 'stale') && onGenerate && (
            <button
              aria-label={status === 'stale' ? `Perbarui ${title}` : `Buat ${title}`}
              onClick={onGenerate}
              disabled={disabled}
              className="text-xs bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1 rounded transition-colors"
            >
              {status === 'stale' ? 'Perbarui' : 'Buat'}
            </button>
          )}

          {status === 'generating' && (
            <span className="text-xs text-amber-400 animate-pulse">Memproses...</span>
          )}
        </div>
      </div>

      {/* Body */}
      {open && children && (
        <div id={`section-body-${title}`} className="border-t border-slate-800 px-4 py-4">
          {children}
        </div>
      )}

      {open && !children && status === 'empty' && (
        <div id={`section-body-${title}`} className="border-t border-slate-800 px-4 py-8 text-center text-slate-600 text-sm">
          Klik &ldquo;Buat&rdquo; untuk menghasilkan bagian ini
        </div>
      )}
    </div>
  )
}
