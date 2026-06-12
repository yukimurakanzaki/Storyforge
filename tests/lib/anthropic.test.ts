import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Bug Condition Exploration Test — ZDR Header Missing from Anthropic Client
 *
 * Validates: Requirements 1.1, 2.1, 2.2
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - A shared Anthropic client module exists at lib/anthropic.ts
 * - The client is constructed with defaultHeaders containing 'anthropic-beta': 'zdr-2025-01-01'
 *
 * On UNFIXED code, this test MUST FAIL — failure confirms the bug exists:
 * - lib/anthropic.ts does not exist (import fails)
 * - Routes use `new Anthropic({ apiKey })` without defaultHeaders
 *
 * GOAL: Surface counterexamples that demonstrate the bug exists.
 */

// Mock the Anthropic SDK constructor to capture instantiation args
const mockAnthropicConstructor = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor(config: unknown) {
      mockAnthropicConstructor(config)
    }
  },
}))

describe('Property 1: Bug Condition — ZDR Header Missing from Anthropic Client', () => {
  beforeEach(() => {
    vi.resetModules()
    mockAnthropicConstructor.mockClear()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    delete process.env.ANTHROPIC_ZDR_ENABLED
  })

  /**
   * Validates: Requirements 2.1, 2.2
   *
   * Scoped PBT Approach: The bug is deterministic — any `new Anthropic()` call
   * without `defaultHeaders['anthropic-beta'] = 'zdr-2025-01-01'` is a bug condition.
   */
  it('shared anthropic client is constructed with ZDR defaultHeaders when enabled', async () => {
    process.env.ANTHROPIC_ZDR_ENABLED = 'true'
    // This import will FAIL on unfixed code because lib/anthropic.ts does not exist
    const { anthropic } = await import('@/lib/anthropic')

    // Verify the module exports a client instance
    expect(anthropic).toBeDefined()

    // Verify the constructor was called with the ZDR header in defaultHeaders
    expect(mockAnthropicConstructor).toHaveBeenCalledTimes(1)

    const constructorConfig = mockAnthropicConstructor.mock.calls[0][0]
    expect(constructorConfig).toHaveProperty('defaultHeaders')
    expect(constructorConfig.defaultHeaders).toHaveProperty(
      'anthropic-beta',
      'zdr-2025-01-01'
    )
  })

  it('shared anthropic client omits ZDR defaultHeaders when not enabled', async () => {
    const { anthropic } = await import('@/lib/anthropic')

    expect(anthropic).toBeDefined()
    expect(mockAnthropicConstructor).toHaveBeenCalledTimes(1)

    const constructorConfig = mockAnthropicConstructor.mock.calls[0][0]
    expect(constructorConfig).toHaveProperty('defaultHeaders')
    expect(constructorConfig.defaultHeaders).not.toHaveProperty('anthropic-beta')
  })

  it('shared anthropic client uses ANTHROPIC_API_KEY from environment', async () => {
    const { anthropic } = await import('@/lib/anthropic')

    expect(anthropic).toBeDefined()
    expect(mockAnthropicConstructor).toHaveBeenCalled()

    const constructorConfig = mockAnthropicConstructor.mock.calls[0][0]
    expect(constructorConfig).toHaveProperty('apiKey', 'test-key')
  })
})
