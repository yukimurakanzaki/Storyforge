'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Session {
  id: string
  created_at: string
  status: 'finalizing' | 'done' | 'active' | 'archived'
  brd_text: string | null
}

interface SessionSidebarProps {
  isAuthenticated: boolean
  onNewSession: () => void
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes}m lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}j lalu`
  const days = Math.floor(hours / 24)
  return `${days}h lalu`
}

function sessionTitle(session: Session): string {
  if (!session.brd_text) return 'Sesi tanpa BRD'
  const firstLine = session.brd_text.split('\n')[0].replace(/^#+\s*/, '').trim()
  return firstLine.slice(0, 48) || 'Sesi tanpa judul'
}

export function SessionSidebar({ isAuthenticated, onNewSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    setIsLoading(true)
    const supabase = createClient()
    supabase
      .from('analysis_results')
      .select('id, created_at, status, brd_text')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setSessions(data as Session[])
        setIsLoading(false)
      })
  }, [isAuthenticated])

  return (
    <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-gray-950 border-r border-gray-800 h-screen">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm">StoryForge</span>
        </Link>
      </div>

      {/* New analysis button */}
      <div className="px-3 py-3 flex-shrink-0">
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Analisis Baru
        </button>
      </div>

      {/* Section label */}
      <div className="px-4 pb-1 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Riwayat</p>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!isAuthenticated ? (
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500">
              <Link href="/login" className="text-teal-400 hover:text-teal-300 transition-colors">
                Masuk
              </Link>{' '}
              untuk lihat riwayat
            </p>
          </div>
        ) : isLoading ? (
          <div className="space-y-1 px-1 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg px-3 py-2 animate-pulse">
                <div className="h-3 bg-gray-800 rounded w-4/5 mb-1.5" />
                <div className="h-2.5 bg-gray-900 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-600">Belum ada riwayat</p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg px-3 py-2 hover:bg-gray-800 transition-colors cursor-default group"
                title={sessionTitle(session)}
              >
                <p className="text-sm text-gray-400 truncate group-hover:text-gray-200 transition-colors">
                  {sessionTitle(session)}
                </p>
                <p className="text-xs text-gray-700 mt-0.5">
                  {formatRelativeTime(session.created_at)}
                  {session.status === 'archived' && ' · Arsip'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
        {isAuthenticated ? (
          <Link href="/dashboard" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">
            Masuk
          </Link>
        )}
      </div>
    </aside>
  )
}
