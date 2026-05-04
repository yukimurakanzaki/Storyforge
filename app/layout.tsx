import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StoryForge.id — BRD Readiness Check untuk Product Manager',
  description:
    'Analisis kesiapan BRD kamu dengan AI. Temukan gap, dapatkan pertanyaan klarifikasi, dan skor kesiapan dalam hitungan detik.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={plusJakarta.variable}>
      <body className={`antialiased ${plusJakarta.className}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Langsung ke konten
        </a>
        {children}
      </body>
    </html>
  )
}
