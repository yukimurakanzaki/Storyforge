'use client'
import { useState, useEffect, useId } from 'react'
import { SectionStatus } from '@/types'

const STATUS_LABELS: Record<SectionStatus, string> = {
  empty: 'Belum dibuat',
  generating: 'Memproses...',
  done: 'Selesai',
  stale: 'Perlu diperbarui',
}

const STATUS_COLORS: Record<SectionStatus, string> = {
  empty: 'text-gray-500 bg-gray-100',
  generating: 'text-amber-700 bg-amber-50',
  done: 'text-teal-700 bg-teal-50',
  stale: 'text-orange-700 bg-orange-50',
}

type Props = {
  title: string
  icon: string          // SVG HTML string
  iconLabel: string     // accessible label for the icon
  badges: string[]
  status: SectionStatus
  disabled?: boolean
  onGenerate?: () => void
  onCopy?: () => void
  children?: React.ReactNode
}

export function SectionCard({ title, icon, iconLabel, badges, status, disabled, onGenerate, onCopy, children }: Props) {
  const id = useId()
  const panelId = `section-panel-${id}`
  const [open, setOpen] = useState(status === 'done' || status === 'stale')

  useEffect(() => {
    if (status === 'done' || status === 'stale') setOpen(true)
  }, [status])

  return (
    <div className="border border-border rounded-xl bg-card/50">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          aria-expanded={open}
          aria-controls={panelId}
        >
          <span
            className="text-muted-foreground flex-shrink-0"
            dangerouslySetInnerHTML={{ __html: icon }}
            aria-hidden="true"
          />
          <span className="text-foreground font-medium text-sm">{title}</span>
          <div className="flex gap-1 flex-wrap">
            {badges.map(b => (
              <span key={b} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {b}
              </span>
            ))}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ml-auto ${STATUS_COLORS[status]}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-muted-foreground text-xs ml-2" aria-hidden="true">{open ? '▲' : '▼'}</span>
        </button>

        <div className="flex gap-2 flex-shrink-0">
          {onCopy && status === 'done' && (
            <button
              onClick={onCopy}
              aria-label={`Salin ${title}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded"
            >
              Salin
            </button>
          )}
          {onGenerate && (
            <button
              onClick={onGenerate}
              disabled={disabled || status === 'generating'}
              aria-label={status === 'stale' ? `Perbarui ${title}` : `Buat ${title}`}
              className="text-xs text-primary-foreground bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground px-3 py-1 rounded transition-colors"
            >
              {status === 'stale' ? 'Perbarui' : 'Buat'}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div id={panelId} className="px-4 pb-4">
          {children ?? (
            <p className="text-muted-foreground text-sm italic">
              {disabled
                ? 'Score ≥ 80 untuk membuka bagian ini. Mulai analysis atau jawab pertanyaan klarifikasi untuk meningkatkan readiness.'
                : 'Belum dibuat.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}