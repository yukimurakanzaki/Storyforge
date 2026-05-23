import { expect, test } from '@playwright/test'

test('user can navigate to analyze page and see mocked analysis results', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: [
        'event: delta',
        'data: {"text": ""}',
        '',
        'event: done',
        'data: ' + JSON.stringify({
          gapList: [
            {
              category: 'Acceptance Criteria',
              description: 'Kriteria sukses checkout belum terukur.',
              severity: 'high',
              confidence: 'high',
              reference: 'BRD menyebut checkout, tetapi tidak ada ukuran sukses.',
            },
          ],
          clarificationQuestions: [
            'Bagaimana sistem menangani pembayaran yang gagal?',
          ],
          readinessScore: 72,
          readinessLabel: 'Perlu Klarifikasi',
        }),
        '',
        ''
      ].join('\n'),
    })
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'BRD-mu Siap Build?' })).toBeVisible()
  await page.getByRole('link', { name: /Analisis BRD Gratis/i }).click()

  await expect(page).toHaveURL(/\/analyze$/)

  await expect(page.getByLabel('BRD / Dokumen Produk')).toBeVisible()

  await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  await page.getByRole('button', { name: /Analyze BRD/i }).click()

  await expect(page.getByText('72').first()).toBeVisible()
  await expect(page.getByText('/100').filter({ visible: true }).first()).toBeVisible()
  await expect(page.getByText('Perlu Klarifikasi', { exact: true }).first()).toBeVisible()

  // Expand the collapsed Gap Analysis section to make its items visible
  await page.getByRole('button', { name: /Gap Analysis/i }).first().click()

  await expect(page.getByText('Bukti kuat', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('BRD menyebut checkout, tetapi tidak ada ukuran sukses.')).toBeVisible()
  await expect(
    page.getByText('Bagaimana sistem menangani pembayaran yang gagal?'),
  ).toBeVisible()
  await expect(page.getByText('Acceptance Criteria').first()).toBeVisible()
})

test('user can refine and generate requirements from mocked API', async ({ page }) => {
  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: [
        'event: delta',
        'data: {"text": ""}',
        '',
        'event: done',
        'data: ' + JSON.stringify({
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
        '',
        ''
      ].join('\n'),
    })
  })

  await page.route('**/api/refine', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: [
        'event: delta',
        'data: {"text": "Baik, alur refund dan approver sudah jelas. Requirements siap digenerate."}',
        '',
        'event: done',
        'data: ' + JSON.stringify({
          message: 'Baik, alur refund dan approver sudah jelas. Requirements siap digenerate.',
          readyToFinalize: true,
          analysis: {
            gapList: [],
            clarificationQuestions: [],
            readinessScore: 82,
            readinessLabel: 'Siap',
          },
        }),
        '',
        ''
      ].join('\n'),
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

  await page.getByPlaceholder(/Tambah konteks.*jawab pertanyaan/i).fill(
    'Refund hanya bisa disetujui oleh finance lead setelah nominal diverifikasi.',
  )
  await page.getByRole('button', { name: 'Kirim pesan' }).click()

  await expect(page.getByText(/requirements siap digenerate/i)).toBeVisible()
  await expect(page.getByText('82').first()).toBeVisible()

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
      contentType: 'text/event-stream',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: [
        'event: delta',
        'data: {"text": ""}',
        '',
        'event: done',
        'data: ' + JSON.stringify({
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
        '',
        ''
      ].join('\n'),
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

  await page.getByPlaceholder(/Tambah konteks.*jawab pertanyaan/i).fill(
    'Kami akan memakai Xendit untuk pembayaran kartu dan virtual account.',
  )
  await page.getByRole('button', { name: 'Kirim pesan' }).click()

  await expect(page.getByText('Gagal memproses. Coba lagi.')).toBeVisible()
  await expect(page.getByText('Payment gateway mana yang akan digunakan?')).toBeVisible()
})

test('living document — create project, paste BRD, see foundation section', async ({ page }) => {
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`))
  page.on('pageerror', err => console.log(`[Browser PageError] ${err.stack || err.message}`))
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const session = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'user@example.com',
      app_metadata: { providers: ['email'] },
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    },
  }
  const sessionStr = JSON.stringify(session)
  const base64Value = Buffer.from(sessionStr).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  await page.context().addCookies([
    {
      name: 'sb-shnbucctqnaruflfdszg-auth-token',
      value: `base64-${base64Value}`,
      domain: '127.0.0.1',
      path: '/',
    },
    {
      name: 'sb-shnbucctqnaruflfdszg-auth-token',
      value: `base64-${base64Value}`,
      domain: 'localhost',
      path: '/',
    },
  ])

  await page.addInitScript((expires) => {
    window.localStorage.setItem(
      'sb-shnbucctqnaruflfdszg-auth-token',
      JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: expires,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          app_metadata: { providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
          role: 'authenticated',
        },
      })
    )
  }, expiresAt)

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-123',
        email: 'user@example.com',
        app_metadata: { providers: ['email'] },
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
      }),
    })
  })

  await page.route('**/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          app_metadata: { providers: ['email'] },
          user_metadata: {},
          aud: 'authenticated',
          role: 'authenticated',
        },
      }),
    })
  })

  await page.route('**/rest/v1/subscriptions*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'pro' }),
    })
  })

  await page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: [] }),
      })
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project: {
            id: 'project-123',
            user_id: 'user-123',
            name: 'Test Project E2E',
            context: {
              business: { description: '', domain: '', targetUsers: [], compliance: [] },
              technical: { frontend: '', backend: '', existingSystems: [], constraints: [] },
            },
            design_md: null,
            design_md_source: null,
            created_at: '2026-04-23T13:15:00.000Z',
          },
        }),
      })
    }
  })

  await page.route('**/api/projects/project-123/context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        project: {
          id: 'project-123',
          user_id: 'user-123',
          name: 'Test Project E2E',
          context: {
            business: { description: '', domain: '', targetUsers: [], compliance: [] },
            technical: { frontend: '', backend: '', existingSystems: [], constraints: [] },
          },
          design_md: null,
          design_md_source: null,
          created_at: '2026-04-23T13:15:00.000Z',
        },
      }),
    })
  })

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: 'event: delta\ndata: {"text": "{\\n  \\"gapList\\": [],\\n  \\"clarificationQuestions\\": [],\\n  \\"readinessScore\\": 90,\\n  \\"readinessLabel\\": \\"Siap\\"\\n}"}\n\nevent: done\ndata: {"gapList": [], "clarificationQuestions": [], "readinessScore": 90, "readinessLabel": "Siap"}\n\n',
    })
  })

  await page.goto('/analyze')

  // Project selector appears
  await expect(page.getByText('Pilih Project')).toBeVisible()

  // Create new project
  await page.getByText('+ Project baru').click()
  await page.getByPlaceholder('Nama project, misal: Invoice Module').fill('Test Project E2E')
  await page.keyboard.press('Enter')

  // Context form appears — skip by clicking Batal
  await page.getByRole('button', { name: 'Batal' }).click()

  // BRD input appears
  await expect(page.getByRole('textbox')).toBeVisible()
  await page.getByRole('textbox').fill(
    'Sistem perlu fitur approval invoice. Finance Approver bisa approve atau reject invoice dari vendor.'
  )
  await page.getByRole('button', { name: /Analisis/i }).click()

  // Analyzing state

  // Foundation section appears
  await expect(page.getByText('Foundation')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Readiness Score')).toBeVisible()
})

// TODO: full validation requires a seeded session with auth.
// Score badge on sidebar items only appears after an authenticated analysis is saved.
test.skip('living document — re-open session shows readiness score in sidebar', async ({ page }) => {
  await page.goto('/analyze')
  await expect(page.getByText('Pilih Project')).toBeVisible()
  // Score badge only appears after analysis — tested manually until session seeding is available
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
