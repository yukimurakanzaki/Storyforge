'use client'
import { useWorkspace } from '@/hooks/useWorkspace'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { ChatPanel } from './ChatPanel'
import { EmptyState } from './EmptyState'
import { ArtifactPanel } from './ArtifactPanel'

export function WorkspaceShell({ plan = 'free' }: { plan?: 'free' | 'pro' }) {
  const ws = useWorkspace()
  const hasSession = !!ws.state && ws.state.messages.length > 0
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <WorkspaceSidebar activeSessionId={ws.sessionId} onNew={ws.startNewSession} onOpen={ws.loadSession} />
      <main id="main-content" className="flex min-w-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col border-r border-gray-200">
          {ws.error && (
            <div className="flex-shrink-0 bg-red-50 px-6 py-2 text-sm text-red-700">{ws.error}</div>
          )}
          {ws.limitReached && (
            <div
              role="alert"
              data-testid="limit-reached"
              className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900"
            >
              {ws.limitReached.plan === 'pro'
                ? `Kamu sudah mencapai batas ${ws.limitReached.limit} analisis bulan ini.`
                : `Jatah analisis gratis bulan ini sudah habis (${ws.limitReached.count}/${ws.limitReached.limit}). Kamu masih bisa melanjutkan sesi yang sudah ada.`}
            </div>
          )}
          {hasSession
            ? <ChatPanel messages={ws.state!.messages} isSending={ws.isSending} lastResolved={ws.lastResolved} onSend={ws.sendMessage} />
            : <EmptyState onSend={ws.sendMessage} isSending={ws.isSending} />}
        </section>
        {hasSession && (
          <aside className="hidden w-[42%] max-w-xl flex-shrink-0 flex-col overflow-y-auto bg-gray-50 lg:flex">
            <ArtifactPanel ws={ws} plan={plan} />
          </aside>
        )}
      </main>
    </div>
  )
}
