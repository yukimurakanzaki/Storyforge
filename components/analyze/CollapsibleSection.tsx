'use client'

import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  count?: number
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const toggleId = `collapsible-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="rounded-lg border border-border bg-muted mb-2 overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={toggleId}
        id={`toggle-${toggleId}`}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <svg
          aria-hidden="true"
          className={`w-3 h-3 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            fillRule="evenodd"
            d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">· {count}</span>
        )}
        {badge && <span className="ml-auto">{badge}</span>}
      </button>

      {isOpen && (
        <div id={toggleId} className="border-t border-border bg-card px-4 py-3">
          {children}
        </div>
      )}
    </div>
  )
}