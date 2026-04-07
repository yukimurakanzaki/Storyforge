import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="id">
      <body className="antialiased font-sans">{children}</body>
    </html>
  )
}
