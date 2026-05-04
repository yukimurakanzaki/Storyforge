'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'

type LoginMode = 'password' | 'magic-link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<LoginMode>('password')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus('error')
      setErrorMsg('Email atau password salah.')
    } else {
      const params = new URLSearchParams(window.location.search)
      const redirectPath = sanitizeAuthRedirectPath(params.get('redirect'))
      router.push(redirectPath)
      router.refresh()
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const redirectTo = new URL('/api/auth/callback', siteUrl)

    const params = new URLSearchParams(window.location.search)
    const redirectPath = sanitizeAuthRedirectPath(params.get('redirect'))
    redirectTo.searchParams.set('redirect', redirectPath)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
        shouldCreateUser: false, // login only — don't create new accounts here
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg('Tidak bisa mengirim magic link. Pastikan email kamu sudah terdaftar.')
    } else {
      setStatus('sent')
    }
  }

  function switchMode(next: LoginMode) {
    setMode(next)
    setStatus('idle')
    setErrorMsg('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Masuk ke StoryForge</h1>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'password'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('magic-link')}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'magic-link'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Magic link — sent state */}
        {mode === 'magic-link' && status === 'sent' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-800">Magic link terkirim!</p>
            <p className="mt-2 text-sm text-green-600">Cek email kamu untuk link masuk</p>
            <p className="mt-1 text-xs text-green-500">{email}</p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-4 text-xs text-green-600 underline hover:text-green-800"
            >
              Kirim ulang
            </button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password kamu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email || !password}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Masuk...' : 'Login'}
            </button>

            <p className="text-center text-xs text-gray-400">
              Lupa password atau daftar via magic link?{' '}
              <button
                type="button"
                onClick={() => switchMode('magic-link')}
                className="text-teal-600 underline hover:text-teal-700"
              >
                Pakai magic link
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email-ml" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email-ml"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Mengirim...' : 'Kirim Magic Link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Belum punya akun?{' '}
          <Link href="/signup" className="font-medium text-teal-600 hover:text-teal-700">
            Daftar
          </Link>
        </p>
      </div>
    </div>
  )
}
