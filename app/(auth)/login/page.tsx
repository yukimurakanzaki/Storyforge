'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'
import { AuthErrorFallback } from '@/components/AuthErrorFallback'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [oauthUnavailable, setOauthUnavailable] = useState(false)
  const [emailAuthUnavailable, setEmailAuthUnavailable] = useState(false)
  const searchParams = useSearchParams()

  const redirectPath = sanitizeAuthRedirectPath(searchParams.get('redirect'))
  const allServicesUnavailable = oauthUnavailable && emailAuthUnavailable

  // Display OAuth error message if redirected back with ?error=auth
  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setStatus('error')
      setErrorMsg('Login dengan Google gagal. Silakan coba lagi.')
    }
    if (searchParams.get('message') === 'password-updated') {
      setSuccessMsg('Password berhasil diubah. Silakan login dengan password baru.')
    }
  }, [searchParams])

  async function handleGoogleLogin() {
    setOauthLoading(true)
    setErrorMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
        },
      })

      if (error) {
        setOauthLoading(false)
        setOauthUnavailable(true)
        setStatus('error')
        setErrorMsg('Login dengan Google gagal. Silakan coba lagi.')
      }
    } catch {
      setOauthLoading(false)
      setOauthUnavailable(true)
      setStatus('error')
      setErrorMsg('Login dengan Google gagal. Silakan coba lagi.')
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.status === 429) {
        const data = await res.json()
        const minutes = Math.ceil((data.retryAfter || 60) / 60)
        setStatus('error')
        setErrorMsg(`Terlalu banyak percobaan. Coba lagi dalam ${minutes} menit.`)
        return
      }

      if (res.status === 401) {
        setStatus('error')
        setErrorMsg('Email atau password salah.')
        return
      }

      if (res.status === 503 || res.status === 502) {
        setEmailAuthUnavailable(true)
        setStatus('error')
        setErrorMsg('Layanan login email sedang tidak tersedia.')
        return
      }

      if (!res.ok) {
        setStatus('error')
        setErrorMsg('Terjadi kesalahan. Coba lagi.')
        return
      }

      // Success — hard navigation to ensure cookies are sent
      window.location.href = redirectPath
    } catch {
      setEmailAuthUnavailable(true)
      setStatus('error')
      setErrorMsg('Terjadi kesalahan. Coba lagi.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Masuk ke StoryForge</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gunakan email dan password akun kamu
          </p>
        </div>

        {/* Google OAuth Button */}
        {successMsg && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {allServicesUnavailable ? (
          <AuthErrorFallback
            onRetry={() => {
              setOauthUnavailable(false)
              setEmailAuthUnavailable(false)
              setStatus('idle')
              setErrorMsg('')
            }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={oauthLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {oauthLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">atau</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
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
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
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
                <div className="mt-1 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Lupa password?
                  </Link>
                </div>
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
            </form>
          </>
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
