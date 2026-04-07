import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-2xl text-center">
        {/* Logo / Brand */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-xs font-medium text-indigo-600 shadow-sm">
          AI-Powered BRD Readiness Check
        </div>

        {/* Headline */}
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          StoryForge<span className="text-indigo-600">.id</span>
        </h1>

        <p className="mt-3 text-xl font-medium text-gray-600">
          Periksa Kesiapan BRD Kamu dengan AI
        </p>

        {/* Sub-copy */}
        <p className="mx-auto mt-5 max-w-lg text-base text-gray-500">
          Upload atau paste dokumen BRD-mu, dan dapatkan analisis gap, pertanyaan
          klarifikasi, serta skor kesiapan dalam hitungan detik — dirancang khusus
          untuk Product Manager Indonesia.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Mulai Analisis →
          </Link>
          <Link
            href="/analyze"
            className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Lihat contoh analisis
          </Link>
        </div>

        {/* Social proof hint */}
        <p className="mt-10 text-xs text-gray-400">
          Gratis untuk 3 analisis pertama · Tidak perlu kartu kredit
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
