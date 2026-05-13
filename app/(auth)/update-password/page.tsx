'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { validatePassword } from '@/lib/auth/password'
import { PasswordStrengthChecklist, isPasswordValid } from '@/components/PasswordStrengthChecklist'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'no-session'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setSessionReady(false)
        setStatus('no-session')
      } else {
        setSessionReady(true)
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const validationError = validatePassword(password)
    if (validationError) {
      setErrorMsg(validationError)
      return
    }
    if (password !== confirm) {
      setErrorMsg('Password tidak cocok')
      return
    }

    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      router.push('/login?message=password-updated')
    }
  }

  if (sessionReady === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Memuat...</p>
      </div>
    )
  }

  if (status === 'no-session') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <Link href="/" className="text-xl font-bold text-teal-600">
              StoryForge<span className="text-gray-800">.id</span>
            </Link>
            <h1 className="mt-3 text-lg font-semibold text-gray-900">Link Tidak Valid</h1>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.
          </div>

          <Link
            href="/forgot-password"
            className="mt-4 block w-full rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Minta Link Baru
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-teal-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Buat Password Baru</h1>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan password baru untuk akun kamu
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password Baru
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
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Password
            </label>
            <input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {(status === 'error' || errorMsg) && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg || 'Terjadi kesalahan. Coba lagi.'}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !password || !confirm || !isPasswordValid(password) || password !== confirm}
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </div>
  )
}
