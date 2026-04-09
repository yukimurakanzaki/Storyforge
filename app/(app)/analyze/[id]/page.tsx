export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getAnalysisById } from '@/lib/history'
import { AuthNav } from '@/components/AuthNav'
import { OutputPanel } from '@/components/analyze/OutputPanel'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AnalysisDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const analysis = await getAnalysisById(supabase, id, user.id)
  if (!analysis) notFound()

  // Get subscription for Pro badge
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const isPro = sub?.plan === 'pro'

  const result = {
    gapList: analysis.gap_list,
    clarificationQuestions: analysis.clarification_questions,
    readinessScore: analysis.readiness_score,
    readinessLabel: analysis.readiness_label,
    sessionId: analysis.session_id || '',
    createdAt: analysis.created_at,
  }

  const firstLine = analysis.brd_text.split('\n')[0].replace(/^#\s*/, '').slice(0, 80)
  const date = new Date(analysis.created_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
              Riwayat
            </Link>
            <Link href="/analyze" className="hover:text-gray-800 transition-colors">
              Analisis Baru
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-2">
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">
            &larr; Kembali ke Riwayat
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{firstLine || 'Analisis BRD'}</h1>
          <p className="mt-1 text-sm text-gray-400">{date}</p>
        </div>

        <OutputPanel result={result} isPro={isPro} />

        {/* BRD Text preview */}
        <details className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-700 hover:text-gray-900">
            Lihat BRD Asli
          </summary>
          <div className="border-t border-gray-100 px-5 py-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
              {analysis.brd_text}
            </pre>
          </div>
        </details>
      </main>
    </div>
  )
}
