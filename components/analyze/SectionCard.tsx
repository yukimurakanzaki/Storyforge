'use client'
import { useState, useEffect } from 'react'
import { SectionStatus } from '@/types'

const STATUS_LABELS: Record<SectionStatus, string> = {
  empty: 'Belum dibuat',
  generating: 'Memproses...',
  done: 'Selesai',
  stale: 'Perlu diperbarui',
}

const STATUS_COLORS: Record<SectionStatus, string> = {
  empty: 'text-slate-500 bg-slate-800',
  generating: 'text-amber-400 bg-amber-900/30',
  done: 'text-teal-400 bg-teal-900/30',
  stale: 'text-orange-400 bg-orange-900/30',
}

type Props = {
  title: string
  icon: string
  badges: string[]
  status: SectionStatus
  disabled?: boolean
  onGenerate?: () => void
  onCopy?: () => void
  children?: React.ReactNode
}

export function SectionCard({ title, icon, badges, status, disabled, onGenerate, onCopy, children }: Props) {
  const panelId = `section-panel-${title.toLowerCase().replace(/\s+/g, '-')}`
  const [open, setOpen] = useState(status === 'done' || status === 'stale')

  useEffect(() => {
    if (status === 'done' || status === 'stale') setOpen(true)
  }, [status])

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-900/50">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 text-left"
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span className="text-lg">{icon}</span>
          <span className="text-slate-100 font-medium text-sm">{title}</span>
          <div className="flex gap-1 flex-wrap">
            {badges.map(b => (
              <span key={b} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                {b}
              </span>
            ))}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ml-auto ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-slate-600 text-xs ml-2">{open ? '▲' : '▼'}</span>
        </button>

        <div className="flex gap-2 flex-shrink-0">
          {onCopy && status === 'done' && (
            <button
              onClick={onCopy}
              aria-label={`Salin ${title}`}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 border border-slate-700 rounded"
            >
              Salin
            </button>
          )}
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={disabled || status === 'generating'}
              aria-label={status === 'stale' ? `Perbarui ${title}` : `Buat ${title}`}
              className="text-xs text-white bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1 rounded transition-colors"
            >
              {status === 'stale' ? 'Perbarui' : 'Buat'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div id={panelId} className="px-4 pb-4">
          {children ?? (
            <p className="text-slate-600 text-sm italic">
              {disabled ? 'Tersedia setelah readiness score ≥ 80.' : 'Belum dibuat.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
