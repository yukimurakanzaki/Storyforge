import { describe, it, expect, beforeEach, vi } from 'vitest'

const STORAGE_KEY = 'sf_temp_session'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

import {
  getTempSession,
  saveTempSession,
  clearTempSession,
  initTempSession,
  incrementRefinementRound,
} from '@/lib/session/temp-session'
import type { TempSession } from '@/types'

const FRESH_SESSION: TempSession = {
  id: 'test-id',
  createdAt: new Date().toISOString(),
  brdText: '',
  messages: [],
  result: null,
  requirements: null,
  refinementRounds: 0,
  hasGenerated: false,
}

const EXPIRED_SESSION: TempSession = {
  ...FRESH_SESSION,
  createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
}

beforeEach(() => {
  localStorageMock.clear()
})

describe('getTempSession', () => {
  it('returns null when nothing is stored', () => {
    expect(getTempSession()).toBeNull()
  })

  it('returns parsed session when stored and not expired', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(FRESH_SESSION))
    expect(getTempSession()).toEqual(FRESH_SESSION)
  })

  it('returns null and clears storage when session is older than 24h', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(EXPIRED_SESSION))
    expect(getTempSession()).toBeNull()
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns null when stored value is malformed JSON', () => {
    localStorageMock.setItem(STORAGE_KEY, 'not-json')
    expect(getTempSession()).toBeNull()
  })
})

describe('saveTempSession', () => {
  it('writes session to localStorage', () => {
    saveTempSession(FRESH_SESSION)
    expect(JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)).toEqual(FRESH_SESSION)
  })
})

describe('clearTempSession', () => {
  it('removes the key from localStorage', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(FRESH_SESSION))
    clearTempSession()
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('initTempSession', () => {
  it('creates a new session when none exists', () => {
    const session = initTempSession()
    expect(session.refinementRounds).toBe(0)
    expect(session.hasGenerated).toBe(false)
    expect(session.id).toBeTruthy()
  })

  it('returns existing session when one already exists', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(FRESH_SESSION))
    const session = initTempSession()
    expect(session.id).toBe('test-id')
  })
})

describe('incrementRefinementRound', () => {
  it('increments the round counter and saves', () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify(FRESH_SESSION))
    incrementRefinementRound()
    expect(getTempSession()?.refinementRounds).toBe(1)
  })

  it('does nothing when no session exists', () => {
    expect(() => incrementRefinementRound()).not.toThrow()
  })
})
