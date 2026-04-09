'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const supabase = createClient()
    const redirectTo = new URL('/api/auth/callback', window.location.origin)

    // Preserve redirect param if present
    const params = new URLSearchParams(window.location.search)
    const redirectPath = params.get('redirect')
    if (redirectPath) {
      redirectTo.searchParams.set('redirect', redirectPath)
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo.toString() },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <h1 className="mt-3 text-lg font-semibold text-gray-900">Masuk ke StoryForge</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kami akan kirim magic link ke email kamu
          </p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-800">
              Link login sudah dikirim!
            </p>
            <p className="mt-2 text-sm text-green-600">
              Cek inbox <strong>{email}</strong> dan klik link untuk masuk.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMsg || 'Terjadi kesalahan. Coba lagi.'}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Mengirim...' : 'Kirim Magic Link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Dengan masuk, kamu menyetujui{' '}
          <Link href="/terms" className="underline hover:text-gray-600">Syarat Layanan</Link>
          {' '}dan{' '}
          <Link href="/privacy" className="underline hover:text-gray-600">Kebijakan Privasi</Link>
          {' '}kami.
        </p>
      </div>
    </div>
  )
}
