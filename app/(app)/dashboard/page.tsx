import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-bold text-indigo-600">
            StoryForge<span className="text-gray-800">.id</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-700">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">Coming soon — riwayat analisis akan muncul di sini.</p>
        <Link
          href="/analyze"
          className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Kembali ke Analisis
        </Link>
      </main>
    </div>
  )
}
