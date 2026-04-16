import { describe, it, expect } from 'vitest'
import { buildMarkdown } from '@/lib/requirements-markdown'
import { RequirementsResult } from '@/types'

const SAMPLE: RequirementsResult = {
  generatedAt: '2026-04-14T00:00:00.000Z',
  epics: [
    {
      title: 'Notifikasi Pembayaran',
      description: 'Epic untuk sistem notifikasi.',
      stories: [
        {
          title: 'Terima notifikasi push',
          description: 'Sebagai pengguna, saya ingin menerima notifikasi push.',
          acceptanceCriteria: [
            'Notifikasi terkirim dalam 5 detik',
            'Notifikasi menampilkan nominal transaksi',
          ],
        },
      ],
    },
    {
      title: 'Preferensi Notifikasi',
      description: 'Epic untuk pengaturan notifikasi.',
      stories: [
        {
          title: 'Nonaktifkan notifikasi',
          description: 'Sebagai pengguna, saya ingin menonaktifkan notifikasi.',
          acceptanceCriteria: ['Toggle tersedia di halaman Pengaturan'],
        },
      ],
    },
  ],
}

describe('buildMarkdown', () => {
  it('includes epic titles as h2', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('## Notifikasi Pembayaran')
    expect(md).toContain('## Preferensi Notifikasi')
  })

  it('includes story titles as h3', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('### Terima notifikasi push')
    expect(md).toContain('### Nonaktifkan notifikasi')
  })

  it('includes acceptance criteria as bullet points', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('- Notifikasi terkirim dalam 5 detik')
    expect(md).toContain('- Notifikasi menampilkan nominal transaksi')
  })

  it('separates epics with horizontal rule', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('---')
  })

  it('handles single epic with no separator', () => {
    const single: RequirementsResult = {
      generatedAt: '2026-04-14T00:00:00.000Z',
      epics: [SAMPLE.epics[0]],
    }
    const md = buildMarkdown(single)
    expect(md).not.toContain('---')
  })

  it('returns empty string for empty epics', () => {
    const empty: RequirementsResult = { generatedAt: '2026-04-14T00:00:00.000Z', epics: [] }
    expect(buildMarkdown(empty)).toBe('')
  })
})
