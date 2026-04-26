'use client'

import { useEffect } from 'react'
import { getTempSession, clearTempSession } from '@/lib/session/temp-session'

export function useMigrateTempSession(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return

    const session = getTempSession()
    if (!session) return

    fetch('/api/migrate-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
      .then((res) => {
        if (res.ok) clearTempSession()
      })
      .catch((err) => console.error('[migrate-session]', err))
  }, [isAuthenticated])
}
