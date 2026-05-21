'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { TierBadge } from '@/components/ui/TierBadge'

interface AuthNavProps {
  showDashboardLink?: boolean
}

export function AuthNav({ showDashboardLink = true }: AuthNavProps) {
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        setPlan((sub?.plan as 'free' | 'pro') ?? 'free')
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (!session?.user) {
          setPlan(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
      {plan && <TierBadge plan={plan} />}
      {showDashboardLink && (
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Dashboard
        </Link>
      )}
      <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
        Pengaturan
      </Link>
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
