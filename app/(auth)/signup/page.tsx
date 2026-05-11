'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sanitizeAuthRedirectPath } from '@/lib/auth/redirect'
import { validatePassword } from '@/lib/auth/password'

type SignupStatus = 'idle' | 'loading' | 'sent' | 'error'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

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

    const params = new URLSearchParams(window.location.search)
    const redirectPath = sanitizeAuthRedirectPath(params.get('redirect'))

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    if (data.session) {
      router.push(redirectPath)
      router.refresh()
      return
    }

    setStatus('sent')
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
        ) : (
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
                placeholder="Min. 8 karakter"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Min. 8 karakter, 1 huruf kapital, 1 angka, 1 simbol
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">
                Konfirmasi Password
              </label>
              <input
                id="confirm"
                type="password"
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
              disabled={status === 'loading' || !email || !password || !confirm}
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Mendaftarkan...' : 'Daftar'}
            </button>
          </form>
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