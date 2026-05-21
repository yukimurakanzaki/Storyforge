import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit tests for /api/usage route
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 * - Authenticated users get usage data from server
 * - Unauthenticated users get 401 (skip fetch entirely)
 * - No localStorage or client-side state used
 */

// Mock Supabase server client
const mockGetUser = vi.fn()

function makeQueryBuilder(data: unknown = null) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = chain
  builder.eq = chain
  builder.single = vi.fn().mockResolvedValue({ data, error: null })
  builder.update = chain
  builder.insert = vi.fn().mockResolvedValue({ data: null, error: null })
  return builder
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'subscriptions') {
    return makeQueryBuilder({ plan: 'free' })
  }
  if (table === 'usage_counters') {
    return makeQueryBuilder({ count: 2, reset_at: null, first_analysis_at: null })
  }
  return makeQueryBuilder(null)
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

describe('/api/usage route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated request', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { GET } = await import('@/app/api/usage/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toHaveProperty('error', 'Unauthorized')
    expect(data).toHaveProperty('message', 'Login diperlukan.')
  })

  it('returns usage data for authenticated free-tier user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'free' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 2, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })

    const { GET } = await import('@/app/api/usage/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ used: 2, limit: 3, plan: 'free' })
  })

  it('returns usage data for authenticated pro-tier user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'pro' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 10, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })

    const { GET } = await import('@/app/api/usage/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ used: 10, limit: 50, plan: 'pro' })
  })

  it('returns used: 0 when no usage_counters row exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-new' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'free' })
      if (table === 'usage_counters') return makeQueryBuilder(null) // no row
      return makeQueryBuilder(null)
    })

    const { GET } = await import('@/app/api/usage/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ used: 0, limit: 3, plan: 'free' })
  })

  it('sets Cache-Control: no-store header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'subscriptions') return makeQueryBuilder({ plan: 'free' })
      if (table === 'usage_counters') return makeQueryBuilder({ count: 1, reset_at: null, first_analysis_at: null })
      return makeQueryBuilder(null)
    })

    const { GET } = await import('@/app/api/usage/route')
    const response = await GET()

    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('does NOT use localStorage or client-side state', async () => {
    // This test validates Requirement 12.4 by verifying the route file
    // does not reference localStorage, sessionStorage, or window
    const fs = await import('fs')
    const path = await import('path')
    const routeContent = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/usage/route.ts'),
      'utf-8'
    )

    expect(routeContent).not.toContain('localStorage')
    expect(routeContent).not.toContain('sessionStorage')
    expect(routeContent).not.toContain('window.')
  })
})
