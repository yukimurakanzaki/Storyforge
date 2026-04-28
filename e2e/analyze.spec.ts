import { expect, test } from '@playwright/test'

test('user can navigate to analyze page and see mocked analysis results', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gapList: [
          {
            category: 'Acceptance Criteria',
            description: 'Kriteria sukses checkout belum terukur.',
            severity: 'high',
          },
        ],
        clarificationQuestions: [
          'Bagaimana sistem menangani pembayaran yang gagal?',
        ],
        readinessScore: 72,
        readinessLabel: 'Perlu Klarifikasi',
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'StoryForge.id' })).toBeVisible()
  await page.getByRole('link', { name: /Mulai Analisis/i }).click()

  await expect(page).toHaveURL(/\/analyze$/)
  await expect(page.getByLabel('BRD / Dokumen Produk')).toBeVisible()

  await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  await page.getByRole('button', { name: /Analyze BRD/i }).click()

  await expect(page.getByText('Kesiapan BRD')).toBeVisible()
  await expect(page.getByText('72%')).toBeVisible()
  await expect(page.getByText('Perlu Klarifikasi', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Bagaimana sistem menangani pembayaran yang gagal?', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Acceptance Criteria')).toBeVisible()
})

test('user can refine and generate requirements from mocked API', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gapList: [
          {
            category: 'Edge Case',
            description: 'Alur refund belum dijelaskan.',
            severity: 'medium',
          },
        ],
        clarificationQuestions: [
          'Siapa yang berhak menyetujui refund?',
        ],
        readinessScore: 68,
        readinessLabel: 'Perlu Klarifikasi',
      }),
    })
  })

  await page.route('**/api/refine', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Baik, alur refund dan approver sudah jelas. Requirements siap digenerate.',
        readyToFinalize: true,
        analysis: {
          gapList: [],
          clarificationQuestions: [],
          readinessScore: 82,
          readinessLabel: 'BRD Lengkap',
        },
      }),
    })
  })

  await page.route('**/api/save-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  await page.route('**/api/requirements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: '2026-04-23T13:15:00.000Z',
        userStories: [
          {
            title: 'Ajukan Refund',
            asA: 'finance admin',
            iWant: 'mengajukan refund',
            soThat: 'pengembalian dana bisa diproses',
            investNotes: {
              independent: 'Dapat dibangun tanpa fitur dispute lanjutan.',
              negotiable: 'Detail approval bisa disesuaikan dengan SOP finance.',
              valuable: 'Mengurangi refund manual dan memperjelas tanggung jawab.',
              estimable: 'Scope form dan approval cukup jelas.',
              small: 'Bisa selesai dalam satu sprint.',
              testable: 'Dapat diuji melalui skenario pengajuan refund.',
            },
            acceptanceCriteria: [
              {
                title: 'Refund diajukan dengan alasan',
                given: ['Finance admin membuka form refund'],
                when: ['Admin mengisi alasan refund'],
                then: ['Form refund menyimpan alasan refund'],
              },
            ],
          },
        ],
      }),
    })
  })

  await page.goto('/analyze')

  await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  await page.getByRole('button', { name: /Analyze BRD/i }).click()

  await page.getByPlaceholder(/Tambah konteks atau jawab pertanyaan/i).fill(
    'Refund hanya bisa disetujui oleh finance lead setelah nominal diverifikasi.',
  )
  await page.getByRole('button', { name: /^Kirim$/i }).click()

  await expect(page.getByText(/requirements siap digenerate/i)).toBeVisible()
  await expect(page.getByText('82%')).toBeVisible()

  await page.getByRole('button', { name: /Generate User Stories/i }).click()

  await expect(page.getByText('User Stories (1)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ajukan Refund' })).toBeVisible()
  await expect(page.getByText(/Sebagai finance admin/)).toBeVisible()
  await expect(page.getByText('Form refund menyimpan alasan refund')).toBeVisible()
})

test('user sees a helpful error when refinement fails', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gapList: [
          {
            category: 'Dependency',
            description: 'Integrasi payment gateway belum lengkap.',
            severity: 'high',
          },
        ],
        clarificationQuestions: [
          'Payment gateway mana yang akan digunakan?',
        ],
        readinessScore: 55,
        readinessLabel: 'Perlu Klarifikasi',
      }),
    })
  })

  await page.route('**/api/refine', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Terjadi kesalahan. Coba lagi.',
      }),
    })
  })

  await page.goto('/analyze')

  await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  await page.getByRole('button', { name: /Analyze BRD/i }).click()

  await page.getByPlaceholder(/Tambah konteks atau jawab pertanyaan/i).fill(
    'Kami akan memakai Xendit untuk pembayaran kartu dan virtual account.',
  )
  await page.getByRole('button', { name: /^Kirim$/i }).click()

  await expect(page.getByText('Gagal memproses. Coba lagi.')).toBeVisible()
  await expect(page.getByText('Payment gateway mana yang akan digunakan?', { exact: true })).toBeVisible()
})

test('guest at quota cannot start another analysis', async ({ page }) => {
  let analyzeCalls = 0
  await page.route('**/api/analyze', async (route) => {
    analyzeCalls += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        gapList: [],
        clarificationQuestions: [],
        readinessScore: 90,
        readinessLabel: 'Siap',
      }),
    })
  })

  await page.goto('/analyze')
  await page.evaluate(() => {
    window.localStorage.setItem(
      'sf_guest_usage_v1',
      JSON.stringify({
        count: 5,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    )
  })
  await page.reload()

  await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  await page.getByRole('button', { name: /Analyze BRD/i }).click()

  await expect(page.getByText(/Batas analisis gratis tercapai/i)).toBeVisible()
  expect(analyzeCalls).toBe(0)
})
