'use client'

import { useState } from 'react'
import { BRDInput } from '@/components/analyze/BRDInput'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import { SAMPLE_BRD } from '@/lib/constants'
import { AnalysisResult } from '@/types'
import Link from 'next/link'

export default function AnalyzePage() {
  const [brdText, setBrdText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | undefined>(undefined)

  async function handleAnalyze(text: string) {
    setIsLoading(true)
    setResult(undefined)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        // API stub returns 501 — show placeholder result for now
        setResult(undefined)
        return
      }

      const data = await res.json()
      setResult(data)
    } catch {
      // silently ignore during scaffold phase
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
              Dashboard
            </Link>
            <Link href="/login" className="hover:text-gray-800 transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analisis BRD</h1>
          <p className="mt-1 text-sm text-gray-500">
            Paste BRD kamu di bawah dan klik Analyze untuk mendapatkan laporan kesiapan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Input Panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <BRDInput
              value={brdText}
              onChange={setBrdText}
              onAnalyze={handleAnalyze}
              onSample={() => setBrdText(SAMPLE_BRD)}
              isLoading={isLoading}
            />
          </div>

          {/* Output Panel */}
          <OutputPanel result={result} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
