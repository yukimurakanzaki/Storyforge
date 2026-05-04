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
      <body className={`antialiased ${plusJakarta.className}`}>{children}</body>
    </html>
  )
}
