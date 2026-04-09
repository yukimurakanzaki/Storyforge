'use client'

import { useState, useEffect } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import { AuthNav } from '@/components/AuthNav'
import { SAMPLE_BRD } from '@/lib/constants'
import { AnalysisResult } from '@/types'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AnalyzePage() {
  const [brdText, setBrdText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [usage, setUsage] = useState<{ count: number; limit: number; plan: string } | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user.id)
        .single()

      const { data: counter } = await supabase
        .from('usage_counters')
        .select('count, reset_at')
        .eq('user_id', user.id)
        .single()

      const plan = sub?.plan || 'free'
      const limit = plan === 'pro' ? 50 : 5
      const resetAt = counter?.reset_at ? new Date(counter.reset_at) : null
      const count = (resetAt && new Date() > resetAt) ? 0 : (counter?.count || 0)

      setUsage({ count, limit, plan })
    }
    fetchUsage()
  }, [result])

  async function handleAnalyze(text: string) {
    setIsLoading(true)
    setResult(undefined)
    setError(undefined)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.status === 429) {
        const data = await res.json()
        setError(data.message || 'Batas analisis tercapai. Upgrade ke Pro.')
        return
      }

      if (res.status === 401) {
        setError('Sesi kamu sudah habis. Silakan login ulang.')
        return
      }

      if (!res.ok || !res.body) {
        setError(`Server error ${res.status}`)
        return
      }

      const sessionId = res.headers.get('X-Session-Id') || crypto.randomUUID()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
      }

      const cleaned = accumulated.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(cleaned)
      setResult({
        ...parsed,
        sessionId,
        createdAt: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
              Riwayat
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analisis BRD</h1>
            <p className="mt-1 text-sm text-gray-500">
              Paste BRD kamu di bawah dan klik Analyze untuk mendapatkan laporan kesiapan.
            </p>
          </div>
          {usage && usage.plan !== 'pro' && (
            <div className="text-right">
              <span className={`text-sm font-medium ${usage.count >= usage.limit ? 'text-red-600' : 'text-gray-500'}`}>
                {usage.count}/{usage.limit} analisis
              </span>
              <p className="text-xs text-gray-400">bulan ini</p>
            </div>
          )}
          {usage?.plan === 'pro' && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              Pro
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {error.includes('Upgrade') && (
              <Link href="/pricing" className="ml-2 font-medium text-indigo-600 underline">
                Lihat paket Pro
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <BRDInput
              value={brdText}
              onChange={setBrdText}
              onAnalyze={handleAnalyze}
              onSample={() => setBrdText(SAMPLE_BRD)}
              isLoading={isLoading}
            />
          </div>
          <OutputPanel result={result} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
