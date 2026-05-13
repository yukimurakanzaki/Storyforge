'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email ?? null)
    }
    getUser()
  }, [router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return

    setStatus('loading')
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      setStatus('error')
      setMessage('Gagal mengirim ulang. Silakan coba lagi.')
    } else {
      setStatus('success')
      setMessage('Email verifikasi telah dikirim ulang.')
      setCooldown(60)
    }
  }, [email, cooldown])

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Verifikasi Email</h1>
        </div>

        <div className="mb-4 text-center text-sm text-gray-600">
          <p>
            Kami telah mengirim link verifikasi ke email kamu. Buka email dan klik link untuk mengaktifkan akun.
          </p>
          {email && (
            <p className="mt-2 font-medium text-gray-900">{email}</p>
          )}
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              status === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={status === 'loading' || cooldown > 0}
          className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading'
            ? 'Mengirim...'
            : cooldown > 0
              ? `Kirim ulang dalam ${cooldown}s`
              : 'Kirim Ulang Email Verifikasi'}
        </button>

        <div className="mt-4 flex flex-col gap-2 text-center text-sm">
          <button
            onClick={() => router.refresh()}
            className="font-medium text-teal-600 hover:text-teal-700"
          >
            Sudah verifikasi? Lanjutkan
          </button>
          <button
            onClick={handleSignOut}
            className="font-medium text-gray-500 hover:text-gray-700"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
