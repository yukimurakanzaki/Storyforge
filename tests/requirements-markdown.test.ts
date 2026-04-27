import { describe, it, expect } from 'vitest'
import { buildMarkdown } from '@/lib/requirements-markdown'
import { RequirementsResult } from '@/types'

const SAMPLE: RequirementsResult = {
  generatedAt: '2026-04-28T00:00:00.000Z',
  userStories: [
    {
      title: 'Login dengan Email',
      asA: 'pengguna terdaftar',
      iWant: 'masuk menggunakan email dan password',
      soThat: 'saya bisa mengakses dashboard saya',
      investNotes: {
        independent: 'Tidak bergantung pada story lain',
        negotiable: 'Detail UI bisa diubah',
        valuable: 'Mengaktifkan akses ke semua fitur',
        estimable: 'Sekitar 3 hari dev',
        small: 'Cukup kecil untuk satu sprint',
        testable: 'Bisa diuji dengan kredensial valid dan invalid',
      },
      acceptanceCriteria: [
        {
          title: 'Login sukses',
          given: ['pengguna berada di halaman login', 'pengguna memiliki akun aktif'],
          when: ['pengguna memasukkan email dan password yang benar', 'pengguna klik tombol Masuk'],
          then: ['pengguna diarahkan ke dashboard', 'sesi login tersimpan selama 30 hari'],
        },
        {
          title: 'Login gagal',
          given: ['pengguna berada di halaman login'],
          when: ['pengguna memasukkan password yang salah'],
          then: ['pesan error ditampilkan', 'pengguna tetap di halaman login'],
        },
      ],
      fieldContextTable: [
        { fieldName: 'email', description: 'Alamat email pengguna', dataType: 'string', example: 'user@email.com' },
        { fieldName: 'password', description: 'Password akun', dataType: 'string', example: 'min. 8 karakter' },
      ],
    },
    {
      title: 'Reset Password',
      asA: 'pengguna yang lupa password',
      iWant: 'menerima link reset password ke email saya',
      soThat: 'saya bisa membuat password baru',
      investNotes: {
        independent: 'Independen dari story login',
        negotiable: 'Metode verifikasi bisa diubah',
        valuable: 'Mengurangi friction untuk pengguna yang terkunci',
        estimable: 'Sekitar 2 hari dev',
        small: 'Satu alur tunggal',
        testable: 'Diuji dengan email terdaftar dan tidak terdaftar',
      },
      acceptanceCriteria: [
        {
          title: 'Kirim link reset',
          given: ['pengguna berada di halaman lupa password'],
          when: ['pengguna memasukkan email terdaftar dan klik Kirim'],
          then: ['email berisi link reset terkirim dalam 60 detik', 'link kadaluwarsa setelah 1 jam'],
        },
      ],
    },
  ],
}

describe('buildMarkdown', () => {
  it('includes story titles as h2', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('## Login dengan Email')
    expect(md).toContain('## Reset Password')
  })

  it('includes "As a" sentence', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('**Sebagai** pengguna terdaftar')
    expect(md).toContain('**ingin** masuk menggunakan email dan password')
    expect(md).toContain('**agar** saya bisa mengakses dashboard saya')
  })

  it('includes INVEST section', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('### INVEST')
    expect(md).toContain('**I — Independent:**')
    expect(md).toContain('**N — Negotiable:**')
    expect(md).toContain('**V — Valuable:**')
    expect(md).toContain('**E — Estimable:**')
    expect(md).toContain('**S — Small:**')
    expect(md).toContain('**T — Testable:**')
  })

  it('includes Gherkin scenarios', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('**Scenario:** Login sukses')
    expect(md).toContain('**Given**')
    expect(md).toContain('**When**')
    expect(md).toContain('**Then**')
  })

  it('includes field context table when present', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('### Field Context')
    expect(md).toContain('| Field | Deskripsi | Tipe Data | Contoh |')
    expect(md).toContain('| email |')
    expect(md).toContain('| password |')
  })

  it('omits field context table when not present', () => {
    const noFieldStory: RequirementsResult = {
      generatedAt: '2026-04-28T00:00:00.000Z',
      userStories: [SAMPLE.userStories[1]], // Reset Password has no fieldContextTable
    }
    const md = buildMarkdown(noFieldStory)
    expect(md).not.toContain('### Field Context')
  })

  it('separates stories with horizontal rule', () => {
    const md = buildMarkdown(SAMPLE)
    expect(md).toContain('---')
  })

  it('returns empty string for empty userStories', () => {
    const empty: RequirementsResult = { generatedAt: '2026-04-28T00:00:00.000Z', userStories: [] }
    expect(buildMarkdown(empty)).toBe('')
  })
})
