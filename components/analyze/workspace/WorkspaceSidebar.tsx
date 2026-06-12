// components/analyze/workspace/WorkspaceSidebar.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SessionRow { session_id: string; title: string | null; last_active_at: string | null; readiness_score: number | null }

export function SidebarView({ sessions, activeSessionId, onNew, onOpen }: {
  sessions: SessionRow[]
  activeSessionId: string
  onNew: () => void
  onOpen: (sessionId: string) => void
}) {
  return (
    <aside className="hidden h-screen w-60 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-950 lg:flex">
      <div className="px-3 py-4">
        <button onClick={onNew}
          className="flex w-full items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
          <span className="text-lg leading-none">＋</span> Analisis Baru
        </button>
      </div>
      <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Terbaru</p>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && <p className="px-3 py-2 text-xs text-gray-600">Belum ada sesi</p>}
        {sessions.map((s) => (
          <button key={s.session_id} onClick={() => onOpen(s.session_id)}
            className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              s.session_id === activeSessionId ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
            {s.title || 'Sesi tanpa judul'}
          </button>
        ))}
      </nav>
    </aside>
  )
}

export function WorkspaceSidebar({ activeSessionId, onNew, onOpen }: {
  activeSessionId: string; onNew: () => void; onOpen: (sessionId: string) => void
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  useEffect(() => {
    const supabase = createClient()
    supabase.from('analysis_results')
      .select('session_id, title, last_active_at, readiness_score')
      .order('last_active_at', { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setSessions(data as SessionRow[]) })
  }, [activeSessionId])
  return <SidebarView sessions={sessions} activeSessionId={activeSessionId} onNew={onNew} onOpen={onOpen} />
}
