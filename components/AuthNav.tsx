'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface AuthNavProps {
  showDashboardLink?: boolean
}

export function AuthNav({ showDashboardLink = true }: AuthNavProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (isLoading) {
    return (
      <span className="text-sm text-gray-400" aria-live="polite">
        Memuat...
      </span>
    )
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Masuk ke akun StoryForge"
      >
        Masuk
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {showDashboardLink && (
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Dashboard
        </Link>
      )}
      <span className="text-xs text-gray-400 hidden sm:inline">
        {user.email}
      </span>
      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Keluar dari akun StoryForge"
      >
        Keluar
      </button>
    </div>
  )
}
