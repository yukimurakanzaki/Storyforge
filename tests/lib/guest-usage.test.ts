import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canGuestAnalyze,
  incrementGuestUsage,
  readGuestUsage,
  GUEST_USAGE_STORAGE_KEY,
} from '@/lib/guest-usage'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
})

describe('guest usage helpers', () => {
  it('allows a fresh guest to analyze', () => {
    expect(canGuestAnalyze()).toEqual({ allowed: true, count: 0, limit: 5 })
  })

  it('blocks guests at the free limit', () => {
    for (let i = 0; i < 5; i += 1) {
      incrementGuestUsage()
    }

    expect(canGuestAnalyze()).toEqual({ allowed: false, count: 5, limit: 5 })
  })

  it('resets expired guest usage windows', () => {
    localStorageMock.setItem(
      GUEST_USAGE_STORAGE_KEY,
      JSON.stringify({
        count: 5,
        resetAt: new Date(Date.now() - 60_000).toISOString(),
      })
    )

    expect(readGuestUsage()).toEqual({ count: 0, limit: 5 })
    expect(canGuestAnalyze().allowed).toBe(true)
  })
})
