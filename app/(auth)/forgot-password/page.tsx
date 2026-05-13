'use client'

import { useState } from 'react'
import Link from 'next/link'

type PageStatus = 'idle' | 'loading' | 'sent' | 'error'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<PageStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        const data = await res.json()
        const minutes = Math.ceil((data.retryAfter || 60) / 60)
        setStatus('error')
        setErrorMsg(`Terlalu banyak permintaan. Coba lagi dalam ${minutes} menit.`)
        return
      }

      setStatus('sent')
    } catch {
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
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Reset Password</h1>
          <p className="mt-1 text-sm text-gray-500">
            Masukkan email akun kamu untuk menerima link reset password
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-800">Cek email kamu untuk link reset password.</p>
            <p className="mt-2 text-xs text-green-500">{email}</p>
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
              {status === 'loading' ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-medium text-teal-600 hover:text-teal-700">
            Kembali ke login
          </Link>
        </p>
      </div>
    </div>
  )
}
