import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-2xl text-center">
        {/* Beta badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-xs font-medium text-indigo-600 shadow-sm">
          Beta Terbatas — AI-Powered BRD Analysis
        </div>

        {/* Headline */}
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          StoryForge<span className="text-indigo-600">.id</span>
        </h1>

        <p className="mt-3 text-xl font-medium text-gray-600">
          Periksa Kesiapan BRD Kamu dengan AI
        </p>

        <p className="mx-auto mt-5 max-w-lg text-base text-gray-500">
          Paste dokumen BRD-mu, dan dapatkan analisis gap, pertanyaan klarifikasi,
          serta skor kesiapan dalam hitungan detik — dirancang khusus untuk
          Product Manager Indonesia.
        </p>

        {/* How it works */}
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4 text-center">
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              1
            </div>
            <p className="text-sm font-medium text-gray-700">Paste BRD</p>
            <p className="mt-1 text-xs text-gray-400">Copy-paste dari Notion, Docs, atau Confluence</p>
          </div>
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              2
            </div>
            <p className="text-sm font-medium text-gray-700">AI Analisis</p>
            <p className="mt-1 text-xs text-gray-400">Gap, skor kesiapan, dan pertanyaan klarifikasi</p>
          </div>
          <div>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
              3
            </div>
            <p className="text-sm font-medium text-gray-700">Kirim ke Stakeholder</p>
            <p className="mt-1 text-xs text-gray-400">Copy pertanyaan, kirim via Slack atau email</p>
          </div>
        </div>

        {/* Target audience */}
        <div className="mx-auto mt-10 max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-left">
          <h3 className="text-sm font-semibold text-gray-700">Untuk siapa StoryForge?</h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-500">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-500">&#10003;</span>
              <span><strong className="text-gray-700">Product Manager</strong> yang menerima BRD dari stakeholder dan ingin catch gap sebelum sprint</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-500">&#10003;</span>
              <span><strong className="text-gray-700">Vibe Coder</strong> yang ingin validasi ide bisnis sebelum mulai coding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-500">&#10003;</span>
              <span><strong className="text-gray-700">Tech Lead</strong> yang ingin memastikan requirement lengkap sebelum estimasi</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login?redirect=/analyze"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Mulai Analisis Gratis
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          5 analisis gratis per bulan · Tidak perlu kartu kredit
        </p>
      </div>

      {/* Footer links */}
      <footer className="absolute bottom-6 flex gap-6 text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">
          Kebijakan Privasi
        </Link>
        <Link href="/terms" className="hover:text-gray-600 transition-colors">
          Syarat Layanan
        </Link>
      </footer>
    </main>
  )
}
