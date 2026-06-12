'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'
import { validatePassword } from '@/lib/auth/password'
import { PasswordStrengthChecklist, isPasswordValid } from '@/components/PasswordStrengthChecklist'
import { AuthErrorFallback } from '@/components/AuthErrorFallback'

type SignupStatus = 'idle' | 'loading' | 'sent' | 'error'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [oauthUnavailable, setOauthUnavailable] = useState(false)
  const [emailAuthUnavailable, setEmailAuthUnavailable] = useState(false)

  const allServicesUnavailable = oauthUnavailable && emailAuthUnavailable

  function getRedirectPath() {
    const params = new URLSearchParams(window.location.search)
    return sanitizeAuthRedirectPath(params.get('redirect'))
  }

  async function handleGoogleSignup() {
    setOauthLoading(true)
    const redirectPath = getRedirectPath()
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
      }
    } catch {
      setOauthLoading(false)
      setOauthUnavailable(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const validationError = validatePassword(password)
    if (validationError) {
      setStatus('error')
      setErrorMsg(validationError)
      return
    }

    if (password !== confirm) {
      setStatus('error')
      setErrorMsg('Password tidak cocok')
      return
    }

    const redirectPath = getRedirectPath()

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
        },
      })

      if (error) {
        // Check if this is a service unavailability error (network/server issues)
        if (error.status === 503 || error.status === 502 || error.message.includes('fetch')) {
          setEmailAuthUnavailable(true)
          setStatus('error')
          setErrorMsg('Layanan pendaftaran sedang tidak tersedia.')
          return
        }

        setStatus('error')
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          setErrorMsg('Email sudah terdaftar. Silakan login atau gunakan email lain.')
        } else {
          setErrorMsg(error.message)
        }
        return
      }

      if (data.session) {
        window.location.href = redirectPath
        return
      }

      setStatus('sent')
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
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Buat Akun Baru</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar dengan email dan password
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-800">Cek email kamu</p>
            <p className="mt-2 text-sm text-green-600">
              Buka link verifikasi untuk mengaktifkan akun StoryForge.
            </p>
            <p className="mt-1 text-xs text-green-500">{email}</p>
          </div>
        ) : allServicesUnavailable ? (
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
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
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
              {oauthLoading ? 'Menghubungkan...' : 'Daftar dengan Google'}
            </button>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">atau</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                  onBlur={() => {
                    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      setEmailError('Format email tidak valid')
                    }
                  }}
                  placeholder="kamu@email.com"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${emailError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'}`}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-500">{emailError}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <PasswordStrengthChecklist
                  password={password}
                  confirmPassword={confirm}
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword(!showPassword)}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
                  Konfirmasi Password
                </label>
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {status === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMsg || 'Terjadi kesalahan. Coba lagi.'}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !email || !password || !confirm || !isPasswordValid(password) || password !== confirm}
                className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? 'Mendaftarkan...' : 'Daftar'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  )
}