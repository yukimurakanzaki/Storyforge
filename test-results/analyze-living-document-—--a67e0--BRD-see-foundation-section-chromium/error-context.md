# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: analyze.spec.ts >> living document — create project, paste BRD, see foundation section
- Location: e2e\analyze.spec.ts:250:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Foundation')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText('Foundation')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Langsung ke konten" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - link "StoryForge" [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e8]
        - generic [ref=e10]: StoryForge
      - button "Analisis Baru" [active] [ref=e12] [cursor=pointer]:
        - img [ref=e13]
        - text: Analisis Baru
      - paragraph [ref=e16]: Riwayat
      - paragraph [ref=e18]: Belum ada riwayat
      - link "Dashboard" [ref=e20] [cursor=pointer]:
        - /url: /dashboard
    - generic [ref=e21]:
      - banner [ref=e22]:
        - link "StoryForge.id" [ref=e23] [cursor=pointer]:
          - /url: /
        - link "Dashboard" [ref=e25] [cursor=pointer]:
          - /url: /dashboard
      - generic [ref=e27]:
        - generic [ref=e28]: Belum ada project. Buat project baru untuk mulai.
        - generic [ref=e29]:
          - heading "Pilih Project" [level=2] [ref=e30]
          - button "+ Project baru" [ref=e31] [cursor=pointer]
        - paragraph [ref=e32]: Belum ada project. Buat project baru untuk mulai.
        - listbox "Daftar project"
  - button "Open Next.js Dev Tools" [ref=e38] [cursor=pointer]:
    - img [ref=e39]
  - alert [ref=e42]
```

# Test source

```ts
  337 |           aud: 'authenticated',
  338 |           role: 'authenticated',
  339 |         },
  340 |       }),
  341 |     })
  342 |   })
  343 | 
  344 |   await page.route('**/rest/v1/subscriptions*', async (route) => {
  345 |     await route.fulfill({
  346 |       status: 200,
  347 |       contentType: 'application/json',
  348 |       body: JSON.stringify({ plan: 'pro' }),
  349 |     })
  350 |   })
  351 | 
  352 |   await page.route('**/api/projects', async (route) => {
  353 |     if (route.request().method() === 'GET') {
  354 |       await route.fulfill({
  355 |         status: 200,
  356 |         contentType: 'application/json',
  357 |         body: JSON.stringify({ projects: [] }),
  358 |       })
  359 |     } else if (route.request().method() === 'POST') {
  360 |       await route.fulfill({
  361 |         status: 200,
  362 |         contentType: 'application/json',
  363 |         body: JSON.stringify({
  364 |           project: {
  365 |             id: 'project-123',
  366 |             user_id: 'user-123',
  367 |             name: 'Test Project E2E',
  368 |             context: {
  369 |               business: { description: '', domain: '', targetUsers: [], compliance: [] },
  370 |               technical: { frontend: '', backend: '', existingSystems: [], constraints: [] },
  371 |             },
  372 |             design_md: null,
  373 |             design_md_source: null,
  374 |             created_at: '2026-04-23T13:15:00.000Z',
  375 |           },
  376 |         }),
  377 |       })
  378 |     }
  379 |   })
  380 | 
  381 |   await page.route('**/api/projects/project-123/context', async (route) => {
  382 |     await route.fulfill({
  383 |       status: 200,
  384 |       contentType: 'application/json',
  385 |       body: JSON.stringify({
  386 |         project: {
  387 |           id: 'project-123',
  388 |           user_id: 'user-123',
  389 |           name: 'Test Project E2E',
  390 |           context: {
  391 |             business: { description: '', domain: '', targetUsers: [], compliance: [] },
  392 |             technical: { frontend: '', backend: '', existingSystems: [], constraints: [] },
  393 |           },
  394 |           design_md: null,
  395 |           design_md_source: null,
  396 |           created_at: '2026-04-23T13:15:00.000Z',
  397 |         },
  398 |       }),
  399 |     })
  400 |   })
  401 | 
  402 |   await page.route('**/api/analyze', async (route) => {
  403 |     await route.fulfill({
  404 |       status: 200,
  405 |       contentType: 'text/event-stream',
  406 |       headers: {
  407 |         'Content-Type': 'text/event-stream',
  408 |         'Cache-Control': 'no-cache',
  409 |       },
  410 |       body: 'event: delta\ndata: {"text": "{\\n  \\"gapList\\": [],\\n  \\"clarificationQuestions\\": [],\\n  \\"readinessScore\\": 90,\\n  \\"readinessLabel\\": \\"Siap\\"\\n}"}\n\nevent: done\ndata: {"gapList": [], "clarificationQuestions": [], "readinessScore": 90, "readinessLabel": "Siap"}\n\n',
  411 |     })
  412 |   })
  413 | 
  414 |   await page.goto('/analyze')
  415 | 
  416 |   // Project selector appears
  417 |   await expect(page.getByText('Pilih Project')).toBeVisible()
  418 | 
  419 |   // Create new project
  420 |   await page.getByText('+ Project baru').click()
  421 |   await page.getByPlaceholder('Nama project, misal: Invoice Module').fill('Test Project E2E')
  422 |   await page.keyboard.press('Enter')
  423 | 
  424 |   // Context form appears — skip by clicking Batal
  425 |   await page.getByRole('button', { name: 'Batal' }).click()
  426 | 
  427 |   // BRD input appears
  428 |   await expect(page.getByRole('textbox')).toBeVisible()
  429 |   await page.getByRole('textbox').fill(
  430 |     'Sistem perlu fitur approval invoice. Finance Approver bisa approve atau reject invoice dari vendor.'
  431 |   )
  432 |   await page.getByRole('button', { name: /Analisis/i }).click()
  433 | 
  434 |   // Analyzing state
  435 | 
  436 |   // Foundation section appears
> 437 |   await expect(page.getByText('Foundation')).toBeVisible({ timeout: 30000 })
      |                                              ^ Error: expect(locator).toBeVisible() failed
  438 |   await expect(page.getByText('Readiness Score')).toBeVisible()
  439 | })
  440 | 
  441 | // TODO: full validation requires a seeded session with auth.
  442 | // Score badge on sidebar items only appears after an authenticated analysis is saved.
  443 | test.skip('living document — re-open session shows readiness score in sidebar', async ({ page }) => {
  444 |   await page.goto('/analyze')
  445 |   await expect(page.getByText('Pilih Project')).toBeVisible()
  446 |   // Score badge only appears after analysis — tested manually until session seeding is available
  447 | })
  448 | 
  449 | test('guest at quota cannot start another analysis', async ({ page }) => {
  450 |   let analyzeCalls = 0
  451 |   await page.route('**/api/analyze', async (route) => {
  452 |     analyzeCalls += 1
  453 |     await route.fulfill({
  454 |       status: 200,
  455 |       contentType: 'application/json',
  456 |       body: JSON.stringify({
  457 |         gapList: [],
  458 |         clarificationQuestions: [],
  459 |         readinessScore: 90,
  460 |         readinessLabel: 'Siap',
  461 |       }),
  462 |     })
  463 |   })
  464 | 
  465 |   await page.goto('/analyze')
  466 |   await page.evaluate(() => {
  467 |     window.localStorage.setItem(
  468 |       'sf_guest_usage_v1',
  469 |       JSON.stringify({
  470 |         count: 5,
  471 |         resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  472 |       })
  473 |     )
  474 |   })
  475 |   await page.reload()
  476 | 
  477 |   await page.getByRole('button', { name: /Coba dengan contoh BRD/i }).click()
  478 |   await page.getByRole('button', { name: /Analyze BRD/i }).click()
  479 | 
  480 |   await expect(page.getByText(/Batas analisis gratis tercapai/i)).toBeVisible()
  481 |   expect(analyzeCalls).toBe(0)
  482 | })
  483 | 
```