'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Session {
  id: string
  created_at: string
  status: 'active' | 'archived'
  requirement_context: string | null
}

interface SessionSidebarProps {
  isAuthenticated: boolean
  onNewSession: () => void
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  return `${days}h lalu`
}

function sessionTitle(session: Session): string {
  if (!session.requirement_context) return 'Sesi tanpa BRD'
  const firstLine = session.requirement_context.split('\n')[0].replace(/^#+\s*/, '').trim()
  return firstLine.slice(0, 48) || 'Sesi tanpa judul'
}

export function SessionSidebar({ isAuthenticated, onNewSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    const supabase = createClient()
    supabase
      .from('analyze_sessions')
      .select('id, created_at, status, requirement_context')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setSessions(data as Session[])
      })
  }, [isAuthenticated])

  if (!isAuthenticated) return null

  return (
    <>
      {/* Toggle button (mobile) */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-20 rounded-full bg-indigo-600 p-3 text-white shadow-lg lg:hidden"
        aria-label="Toggle session history"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-10 w-64 border-r border-gray-200 bg-white flex flex-col',
          'transform transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => { onNewSession(); setIsOpen(false) }}
            className="mb-4 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors text-left"
          >
            + Analisis Baru
          </button>

          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Riwayat Sesi
          </h3>

          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada sesi tersimpan.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <div
                    className="rounded-md px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-default"
                    title="Navigasi per sesi tersedia di update berikutnya"
                  >
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {sessionTitle(s)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatRelativeTime(s.created_at)}
                      {s.status === 'archived' && ' · Arsip'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
