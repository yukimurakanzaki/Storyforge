export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getAnalysisHistory } from '@/lib/history'
import { AuthNav } from '@/components/AuthNav'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const history = await getAnalysisHistory(supabase, user.id, 20)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/analyze" className="hover:text-gray-800 transition-colors">
              Analisis Baru
            </Link>
            <AuthNav />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Analisis</h1>
          <p className="mt-1 text-sm text-gray-500">
            {history.length > 0
              ? `${history.length} analisis terakhir`
              : 'Belum ada analisis. Mulai analisis BRD pertamamu!'}
          </p>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16">
            <p className="text-sm text-gray-400 mb-4">Belum ada riwayat analisis</p>
            <Link
              href="/analyze"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Mulai Analisis
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <Link
                key={item.id}
                href={`/analyze/${item.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {truncate(item.brd_text.split('\n')[0].replace(/^#\s*/, ''), 80)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(item.created_at)} · {item.gap_list.length} gap ditemukan
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-bold text-gray-700">
                    {item.readiness_score}%
                  </span>
                  <Badge
                    label={item.readiness_label}
                    color={getScoreColor(item.readiness_score)}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
