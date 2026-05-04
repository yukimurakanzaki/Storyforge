import Link from 'next/link'
import { AuthNav } from '@/components/AuthNav'

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconDocument({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75-6.75a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />
      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
    </svg>
  )
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
    </svg>
  )
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z" clipRule="evenodd" />
    </svg>
  )
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 0 0 6 21.75a6.721 6.721 0 0 0 3.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 0 1-.814 1.686.75.75 0 0 0 .44 1.223Z" clipRule="evenodd" />
    </svg>
  )
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M14.447 3.026a.75.75 0 0 1 .527.921l-4.5 16.5a.75.75 0 0 1-1.448-.394l4.5-16.5a.75.75 0 0 1 .921-.527ZM16.72 6.22a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L21.44 12l-4.72-4.72a.75.75 0 0 1 0-1.06Zm-9.44 0a.75.75 0 0 1 0 1.06L2.56 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L.97 12.53a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </svg>
  )
}

function IconArrow({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.97 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 1 1-1.06-1.06l6.22-6.22H3a.75.75 0 0 1 0-1.5h16.19l-6.22-6.22a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

function IconWarning({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
    </svg>
  )
}

// ─── Product Mockup ───────────────────────────────────────────────────────────

function ProductMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-teal-200/30 blur-2xl" aria-hidden />
      <div className="relative rounded-2xl bg-white shadow-2xl border border-teal-100 overflow-hidden max-w-md mx-auto">
        {/* Mockup header bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-2 text-xs text-gray-400 font-mono">storyforge.id/analyze</span>
        </div>

        {/* Score header */}
        <div className="bg-teal-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-200 text-xs font-medium">Analisis BRD</p>
              <p className="text-white font-semibold text-sm mt-0.5">Aplikasi Booking Dokter Online</p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-yellow-400 text-yellow-900 text-sm font-bold px-3 py-1 rounded-full">68/100</span>
              <p className="text-teal-200 text-xs mt-1">Perlu Klarifikasi</p>
            </div>
          </div>
          {/* Score bar */}
          <div className="mt-3 h-2 bg-teal-700/50 rounded-full">
            <div className="h-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all" style={{ width: '68%' }} />
          </div>
        </div>

        {/* Gap items */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Gap Ditemukan (5)</p>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-500 text-xs font-bold">!</span>
            </span>
            <p className="text-sm text-gray-700">Role dokter dan pasien tidak didefinisikan</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-orange-500 text-xs font-bold">!</span>
            </span>
            <p className="text-sm text-gray-700">Payment gateway belum dispesifikasikan</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-yellow-600 text-xs font-bold">!</span>
            </span>
            <p className="text-sm text-gray-700">Edge case pembatalan booking tidak dihandle</p>
          </div>
        </div>

        {/* Copy button */}
        <div className="px-5 pb-4">
          <button className="w-full rounded-lg border border-teal-200 text-teal-700 text-sm font-medium py-2.5 hover:bg-teal-50 transition-colors cursor-pointer">
            Salin 8 Pertanyaan Klarifikasi
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-teal-50">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-teal-100 shadow-sm px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <IconSparkle className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-teal-900 text-sm">StoryForge<span className="text-teal-500">.id</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#fitur" className="hover:text-teal-700 transition-colors cursor-pointer">Fitur</a>
            <a href="#harga" className="hover:text-teal-700 transition-colors cursor-pointer">Harga</a>
            <a href="#faq" className="hover:text-teal-700 transition-colors cursor-pointer">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <AuthNav />
            <Link
              href="/analyze"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors cursor-pointer"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-20 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-1.5 text-xs font-semibold text-teal-700 shadow-sm mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Beta Terbatas · AI-Powered BRD Analysis
              </div>

              <h1 className="text-5xl sm:text-6xl font-extrabold text-teal-900 leading-[1.1] tracking-tight">
                BRD-mu<br />
                <span className="text-teal-600">Siap Build?</span>
              </h1>

              <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-md">
                AI yang menganalisis <strong className="text-gray-800">gap, ketidaklengkapan, dan risiko</strong> di BRD kamu — sebelum sprint dimulai dan dev salah build.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-base font-bold text-white hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 cursor-pointer"
                >
                  Analisis BRD Gratis
                  <IconArrow className="w-4 h-4" />
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-6 py-3.5 text-base font-semibold text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                >
                  Lihat Fitur
                </a>
              </div>

              <p className="mt-4 text-sm text-gray-400">
                Gratis · Tidak perlu kartu kredit · Setup dalam 30 detik
              </p>

              {/* Mini trust signals */}
              <div className="mt-8 flex items-center gap-4 flex-wrap">
                {[
                  'PM dari 20+ perusahaan Indonesia',
                  'Analisis dalam <30 detik',
                  'Bahasa Indonesia',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <IconCheck className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right: product mockup */}
            <div className="lg:flex lg:justify-end">
              <ProductMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pain points bar ────────────────────────────────────────────── */}
      <section className="bg-white border-y border-gray-100 py-10 px-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Pernah mengalami ini?</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <IconWarning className="w-5 h-5 text-red-500" />,
                bg: 'bg-red-50 border-red-100',
                title: 'Sprint delay karena BRD ambigu',
                desc: 'Dev mulai build, baru ketahuan requirement belum lengkap di minggu ke-2.',
              },
              {
                icon: <IconWarning className="w-5 h-5 text-orange-500" />,
                bg: 'bg-orange-50 border-orange-100',
                title: 'Dev build fitur yang salah',
                desc: 'Interpretasi berbeda antara PM dan dev — muncul saat demo akhir sprint.',
              },
              {
                icon: <IconWarning className="w-5 h-5 text-yellow-600" />,
                bg: 'bg-yellow-50 border-yellow-100',
                title: 'Stakeholder berubah di tengah sprint',
                desc: 'BRD tidak cover edge case — stakeholder baru sadar setelah dev sudah jalan.',
              },
            ].map(({ icon, bg, title, desc }) => (
              <div key={title} className={`rounded-xl border ${bg} p-5`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{title}</p>
                    <p className="mt-1 text-sm text-gray-500">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="fitur" className="py-20 px-4 bg-teal-50 scroll-mt-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">Cara Kerja</p>
            <h2 className="text-4xl font-extrabold text-teal-900">3 Langkah. &lt;30 Detik.</h2>
            <p className="mt-3 text-gray-500 max-w-md mx-auto">Tidak perlu training, tidak perlu setup. Langsung analisis.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: <IconDocument className="w-6 h-6 text-teal-600" />,
                title: 'Paste BRD-mu',
                desc: 'Copy-paste dari Notion, Google Docs, Confluence, atau dokumen apapun. Format bebas.',
              },
              {
                step: '02',
                icon: <IconSparkle className="w-6 h-6 text-teal-600" />,
                title: 'AI Menganalisis',
                desc: 'Dalam hitungan detik, AI menemukan gap, ketidaklengkapan, dan menghasilkan skor kesiapan.',
              },
              {
                step: '03',
                icon: <IconChat className="w-6 h-6 text-teal-600" />,
                title: 'Kirim ke Stakeholder',
                desc: 'Salin pertanyaan klarifikasi dan kirim ke stakeholder via Slack, email, atau Notion.',
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="relative bg-white rounded-2xl p-7 border border-teal-100 shadow-sm hover:shadow-md transition-shadow">
                <span className="absolute top-5 right-5 text-4xl font-black text-teal-50 select-none">{step}</span>
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-teal-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Output showcase ────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">Output</p>
            <h2 className="text-4xl font-extrabold text-teal-900">Satu Analisis, 4 Output Siap Pakai</h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">Semua yang kamu butuhkan untuk memastikan BRD siap sebelum sprint — dalam satu kali klik.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Gap Analysis */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <IconWarning className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Gap Analysis</h3>
                  <p className="text-xs text-gray-400">Kategori: Konteks, Fungsional, Non-Fungsional, User & Role, Edge Case</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { level: 'Kritis', color: 'bg-red-500', text: 'Tidak ada definisi user role yang jelas' },
                  { level: 'Tinggi', color: 'bg-orange-400', text: 'Alur pembayaran belum dispesifikasikan' },
                  { level: 'Sedang', color: 'bg-yellow-400', text: 'SLA response time tidak disebutkan' },
                ].map(({ level, color, text }) => (
                  <div key={text} className="flex items-start gap-2.5 rounded-lg bg-white p-3 border border-gray-100">
                    <span className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${color}`} />
                    <div>
                      <span className="text-xs font-semibold text-gray-500">{level} · </span>
                      <span className="text-sm text-gray-700">{text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Readiness Score */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <IconChart className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Readiness Score</h3>
                  <p className="text-xs text-gray-400">0–100 · Siap Build / Perlu Klarifikasi / Tidak Siap</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-end gap-4">
                  <div className="text-6xl font-black text-yellow-500">68</div>
                  <div className="pb-2">
                    <div className="text-sm font-bold text-yellow-600">Perlu Klarifikasi</div>
                    <div className="text-xs text-gray-400">dari 100 poin maksimal</div>
                  </div>
                </div>
                <div className="mt-4 h-3 bg-gray-100 rounded-full">
                  <div className="h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full" style={{ width: '68%' }} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-gray-400">
                  <span>0 — Tidak Siap</span>
                  <span>50 — Perlu Klarifikasi</span>
                  <span>80 — Siap</span>
                </div>
              </div>
            </div>

            {/* Clarification Questions */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <IconChat className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Pertanyaan Klarifikasi</h3>
                  <p className="text-xs text-gray-400">Bahasa Indonesia · Siap kirim ke stakeholder</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                {[
                  'Siapa saja role yang akan menggunakan sistem ini, dan apa perbedaan aksesnya?',
                  'Payment gateway mana yang akan digunakan? Apakah perlu support refund otomatis?',
                  'Bagaimana alur jika dokter membatalkan jadwal yang sudah dipesan pasien?',
                ].map((q, i) => (
                  <p key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-teal-200">{q}</p>
                ))}
              </div>
              <button className="mt-3 w-full rounded-lg border border-teal-200 text-teal-700 text-sm font-medium py-2 hover:bg-teal-50 transition-colors cursor-pointer">
                Salin Semua Pertanyaan
              </button>
            </div>

            {/* PRD Draft */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <IconCode className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">PRD Draft</h3>
                  <p className="text-xs text-gray-400">Struktur INVEST + Gherkin · Bahasa Indonesia + English</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 font-mono text-xs text-gray-600 space-y-1 leading-relaxed">
                <p className="font-bold text-gray-800 font-sans text-sm not-italic">User Story: Booking Dokter</p>
                <p className="text-purple-600">As a</p>
                <p className="pl-2">pasien yang ingin konsultasi,</p>
                <p className="text-purple-600">I want to</p>
                <p className="pl-2">memilih jadwal dokter yang tersedia,</p>
                <p className="text-purple-600">So that</p>
                <p className="pl-2">saya bisa konfirmasi booking dalam 5 menit.</p>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-green-600">Scenario:</p>
                  <p className="pl-2">Given pasien sudah login,</p>
                  <p className="pl-2">When memilih dokter &amp; tanggal tersedia,</p>
                  <p className="pl-2">Then booking berhasil dengan notifikasi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who is it for ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-teal-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">Untuk Siapa</p>
            <h2 className="text-4xl font-extrabold text-teal-900">Dibuat Spesifik untuk Kamu</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* PM */}
            <div className="bg-white rounded-2xl border border-teal-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center mb-5">
                <IconUsers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-teal-900 mb-2">Product Manager</h3>
              <p className="text-gray-500 text-sm mb-5">Terima BRD dari stakeholder dan pastikan tidak ada yang terlewat sebelum sprint dimulai.</p>
              <ul className="space-y-2.5">
                {[
                  'Catch gap BRD sebelum dev mulai coding',
                  'Dapatkan pertanyaan klarifikasi siap kirim',
                  'Skor kesiapan objektif untuk diskusi stakeholder',
                  'Hemat 2–3 jam review manual per sprint',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <IconCheck className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/analyze"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
              >
                Coba Sekarang <IconArrow className="w-4 h-4" />
              </Link>
            </div>

            {/* Vibe Coder */}
            <div className="bg-white rounded-2xl border border-orange-100 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center mb-5">
                <IconCode className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-extrabold text-teal-900 mb-2">Vibe Coder / Founder</h3>
              <p className="text-gray-500 text-sm mb-5">Punya ide bisnis? Validasi dulu sebelum mulai coding — pastikan ideamu sudah matang.</p>
              <ul className="space-y-2.5">
                {[
                  'Validasi ide bisnis dengan analisis gap AI',
                  'Temukan blindspot sebelum investasi waktu & uang',
                  'PRD siap paste ke Claude/Cursor untuk vibe coding',
                  'Dari ide ke PRD dalam 5 menit',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <IconCheck className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/analyze"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-800 transition-colors cursor-pointer"
              >
                Validasi Ideku <IconArrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="harga" className="py-20 px-4 bg-white scroll-mt-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">Harga</p>
            <h2 className="text-4xl font-extrabold text-teal-900">Mulai Gratis, Upgrade Kapan Saja</h2>
            <p className="mt-3 text-gray-500">Tidak perlu kartu kredit untuk mulai.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-gray-200 bg-white p-7 hover:border-teal-200 transition-colors">
              <div className="mb-5">
                <h3 className="font-bold text-gray-900 text-lg">Free</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black text-gray-900">Rp0</span>
                  <span className="text-gray-400 pb-1">/bulan</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">Cukup untuk mulai.</p>
              </div>
              <ul className="space-y-3 mb-7">
                {[
                  '3 analisis per bulan',
                  'Gap analysis lengkap',
                  'Readiness score',
                  '5 riwayat analisis',
                  'Output dengan watermark',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <IconCheck className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/analyze"
                className="block w-full text-center rounded-xl border border-teal-200 text-teal-700 font-semibold py-3 hover:bg-teal-50 transition-colors cursor-pointer"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl border-2 border-teal-600 bg-teal-600 p-7 relative shadow-xl shadow-teal-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Paling Populer</span>
              </div>
              <div className="mb-5">
                <h3 className="font-bold text-white text-lg">Pro</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black text-white">Rp199k</span>
                  <span className="text-teal-300 pb-1">/bulan</span>
                </div>
                <p className="mt-2 text-sm text-teal-200">Untuk PM & founder yang serius.</p>
              </div>
              <ul className="space-y-3 mb-7">
                {[
                  '50 analisis per bulan',
                  'Semua fitur Free',
                  'PRD Draft export (Bahasa + English)',
                  'Company Context (analisis sesuai domain)',
                  'Riwayat 90 hari tanpa batas',
                  'Pertanyaan klarifikasi copy-paste ready',
                  'Prioritas support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-teal-100">
                    <IconCheck className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="block w-full text-center rounded-xl bg-orange-500 text-white font-bold py-3 hover:bg-orange-400 transition-colors cursor-pointer shadow-lg shadow-orange-900/20"
              >
                Upgrade ke Pro
              </Link>
              <p className="mt-3 text-xs text-teal-300 text-center">Transfer bank · Dikonfirmasi dalam 1 jam kerja</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4 bg-teal-50 scroll-mt-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl font-extrabold text-teal-900">Pertanyaan yang Sering Ditanya</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Apakah data BRD saya aman?',
                a: 'BRD yang kamu paste hanya digunakan untuk analisis real-time dan tidak disimpan permanen di server kami. Riwayat analisis disimpan di database yang terenkripsi dan hanya bisa diakses oleh akun kamu.',
              },
              {
                q: 'Berapa lama proses analisis?',
                a: 'Umumnya 15–30 detik tergantung panjang BRD. BRD hingga 10.000 kata biasanya selesai dalam 30 detik.',
              },
              {
                q: 'Apakah support Bahasa Indonesia?',
                a: 'Ya! StoryForge dirancang khusus untuk konteks Indonesia. Input dan output bisa dalam Bahasa Indonesia. PRD Draft tersedia dalam dua bahasa (Indonesia + English).',
              },
              {
                q: 'Apa bedanya Free vs Pro?',
                a: 'Free cocok untuk mencoba dengan 3 analisis per bulan. Pro memberikan 50 analisis, Company Context untuk analisis yang lebih relevan dengan domain kamu, riwayat 90 hari, dan PRD export tanpa watermark.',
              },
              {
                q: 'Bagaimana cara upgrade ke Pro?',
                a: 'Setelah membuat akun, klik "Upgrade ke Pro" dan ikuti instruksi transfer bank. Tim kami akan mengaktifkan akun Pro kamu dalam 1 jam kerja.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl border border-teal-100 p-5 hover:border-teal-200 transition-colors">
                <h3 className="font-semibold text-gray-900">{q}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-teal-600">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Siap Analisis BRD Pertamamu?
          </h2>
          <p className="text-teal-200 text-lg mb-8">
            Gratis. Tidak perlu kartu kredit. Setup dalam 30 detik.
          </p>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-lg font-bold text-white hover:bg-orange-400 transition-colors shadow-xl shadow-teal-900/30 cursor-pointer"
          >
            Mulai Analisis Gratis
            <IconArrow className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-teal-300 text-sm">
            Bergabung dengan PM dari 20+ perusahaan Indonesia
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-teal-900 py-10 px-4">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-teal-600 flex items-center justify-center">
              <IconSparkle className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">StoryForge<span className="text-teal-400">.id</span></span>
          </div>

          <div className="flex items-center gap-6 text-xs text-teal-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Syarat Layanan</Link>
          </div>

          <p className="text-xs text-teal-500">
            &copy; {new Date().getFullYear()} StoryForge.id · Made in Indonesia
          </p>
        </div>
      </footer>

    </div>
  )
}
