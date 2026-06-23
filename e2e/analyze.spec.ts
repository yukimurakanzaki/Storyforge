import { expect, test, type Page, type Route } from '@playwright/test'

// These specs exercise the CURRENT living-workspace flow (WorkspaceShell -> POST
// /api/workspace), not the retired /api/analyze UI. Auth uses the non-production
// E2E backdoor: the global `x-e2e-test: true` header (playwright.config.ts) plus
// an `*-auth-token` cookie makes the middleware inject a synthetic user.

const SCORE = 72

const GAP = {
  id: 'g1',
  category: 'edge_case',
  description: 'Penanganan transaksi saat perangkat offline belum dijelaskan.',
  severity: 'high',
  question: 'Bagaimana sistem menangani transaksi saat perangkat offline?',
  status: 'open',
  answer: null,
  source: 'brd',
  conflictsWith: null,
  createdAt: new Date().toISOString(),
  resolvedAt: null,
}

function workspaceState() {
  return {
    sessionId: 'session-e2e',
    title: 'BRD Notifikasi',
    brdText: 'BRD: fitur notifikasi pembayaran.',
    gaps: [GAP],
    readinessScore: SCORE,
    readinessLabel: 'Perlu Klarifikasi',
    prd: null,
    messages: [
      { role: 'user', content: 'BRD: fitur notifikasi pembayaran.' },
      { role: 'assistant', content: 'Saya menemukan beberapa gap.' },
    ],
    contextSummary: '',
    summarizedUpTo: 0,
    lastActiveAt: new Date().toISOString(),
  }
}

function doneSSE() {
  return [
    'event: status',
    'data: {"message":"Menganalisis..."}',
    '',
    'event: done',
    'data: ' +
      JSON.stringify({
        assistantMessage: 'Saya menemukan beberapa gap.',
        intent: 'new_or_expanded_requirement',
        resolvedGapIds: [],
        state: workspaceState(),
      }),
    '',
    '',
  ].join('\n')
}

// Cookie + client-side API stubs so the protected page renders and the sidebar
// (browser-side Supabase query) resolves. The server component's own getUser runs
// server-side and simply resolves to "no user" -> plan defaults to free, which is
// fine; the workspace POST is mocked per-test below.
function fakeSessionCookieValue() {
  const session = {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: { id: 'user-123', email: 'user@example.com', app_metadata: { providers: ['email'] }, user_metadata: {}, aud: 'authenticated', role: 'authenticated' },
  }
  const b64 = Buffer.from(JSON.stringify(session)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `base64-${b64}`
}

async function authenticate(page: Page, plan: 'free' | 'pro' = 'free') {
  const value = fakeSessionCookieValue()
  for (const domain of ['127.0.0.1', 'localhost']) {
    await page.context().addCookies([
      { name: 'sb-shnbucctqnaruflfdszg-auth-token', value, domain, path: '/' },
    ])
  }
  await page.route('**/rest/v1/analysis_results*', (r: Route) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route('**/rest/v1/subscriptions*', (r: Route) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan }) }),
  )
  await page.route('**/api/usage', (r: Route) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ used: 0, limit: plan === 'pro' ? 50 : 3, plan }),
    }),
  )
}

test('free user: paste BRD -> gaps and score render', async ({ page }) => {
  await authenticate(page, 'free')
  await page.route('**/api/workspace', (route: Route) => {
    if (route.request().method() !== 'POST') return route.continue()
    return route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: doneSSE(),
    })
  })

  await page.goto('/analyze')

  await page.getByPlaceholder(/Tempel BRD atau tulis requirement/i).fill('BRD: fitur notifikasi pembayaran.')
  await page.getByRole('button', { name: 'Analisis', exact: true }).click()

  await expect(page.getByText(String(SCORE)).first()).toBeVisible()
  await expect(page.getByText('Perlu Klarifikasi').first()).toBeVisible()
  await expect(page.getByText(GAP.question)).toBeVisible()
})

test('free user at limit: NEW session shows limit-reached state (429), not a crash', async ({ page }) => {
  await authenticate(page, 'free')
  await page.route('**/api/workspace', (route: Route) => {
    if (route.request().method() !== 'POST') return route.continue()
    return route.fulfill({
      status: 429,
      headers: { 'X-Limit-Reached': 'true' },
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Limit reached', count: 3, limit: 3, plan: 'free' }),
    })
  })

  await page.goto('/analyze')

  await page.getByPlaceholder(/Tempel BRD atau tulis requirement/i).fill('BRD baru yang melewati batas.')
  await page.getByRole('button', { name: 'Analisis', exact: true }).click()

  const banner = page.getByTestId('limit-reached')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Jatah analisis gratis bulan ini sudah habis (3/3)')
})

test('unauthenticated user is redirected to login', async ({ page }) => {
  // No auth cookie -> middleware backdoor does not trigger -> redirect to /login.
  await page.goto('/analyze')
  await expect(page).toHaveURL(/\/login/)
})
