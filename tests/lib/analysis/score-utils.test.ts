import { describe, it, expect } from 'vitest'
import { computeReadinessScore, getScoreLabel, computeTopActions } from '@/lib/analysis/score-utils'
import type { ScoreComponents } from '@/types/analysis-v2'

function makeComponents(scores: {
  kelengkapanAlur: number
  kesiapanSprint: number
  kejelasanRequirement: number
  konteksBisnis: number
}): ScoreComponents {
  return {
    kelengkapanAlur: { score: scores.kelengkapanAlur, explanation: 'Test explanation' },
    kesiapanSprint: { score: scores.kesiapanSprint, explanation: 'Test explanation' },
    kejelasanRequirement: { score: scores.kejelasanRequirement, explanation: 'Test explanation' },
    konteksBisnis: { score: scores.konteksBisnis, explanation: 'Test explanation' },
    topActions: [],
  }
}

describe('computeReadinessScore', () => {
  it('computes weighted score with all 100s', () => {
    const components = makeComponents({
      kelengkapanAlur: 100,
      kesiapanSprint: 100,
      kejelasanRequirement: 100,
      konteksBisnis: 100,
    })
    expect(computeReadinessScore(components)).toBe(100)
  })

  it('computes weighted score with all 0s', () => {
    const components = makeComponents({
      kelengkapanAlur: 0,
      kesiapanSprint: 0,
      kejelasanRequirement: 0,
      konteksBisnis: 0,
    })
    expect(computeReadinessScore(components)).toBe(0)
  })

  it('computes correct weighted average', () => {
    // 0.30*80 + 0.25*60 + 0.25*40 + 0.20*100 = 24 + 15 + 10 + 20 = 69
    const components = makeComponents({
      kelengkapanAlur: 80,
      kesiapanSprint: 60,
      kejelasanRequirement: 40,
      konteksBisnis: 100,
    })
    expect(computeReadinessScore(components)).toBe(69)
  })

  it('rounds to nearest integer', () => {
    // 0.30*75 + 0.25*63 + 0.25*81 + 0.20*44 = 22.5 + 15.75 + 20.25 + 8.8 = 67.3
    const components = makeComponents({
      kelengkapanAlur: 75,
      kesiapanSprint: 63,
      kejelasanRequirement: 81,
      konteksBisnis: 44,
    })
    expect(computeReadinessScore(components)).toBe(67)
  })

  it('handles uneven scores correctly', () => {
    // 0.30*50 + 0.25*50 + 0.25*50 + 0.20*50 = 15 + 12.5 + 12.5 + 10 = 50
    const components = makeComponents({
      kelengkapanAlur: 50,
      kesiapanSprint: 50,
      kejelasanRequirement: 50,
      konteksBisnis: 50,
    })
    expect(computeReadinessScore(components)).toBe(50)
  })
})

describe('getScoreLabel', () => {
  it('returns "Siap" for score 80', () => {
    expect(getScoreLabel(80)).toBe('Siap')
  })

  it('returns "Siap" for score 100', () => {
    expect(getScoreLabel(100)).toBe('Siap')
  })

  it('returns "Perlu Klarifikasi" for score 79', () => {
    expect(getScoreLabel(79)).toBe('Perlu Klarifikasi')
  })

  it('returns "Perlu Klarifikasi" for score 50', () => {
    expect(getScoreLabel(50)).toBe('Perlu Klarifikasi')
  })

  it('returns "Tidak Siap" for score 49', () => {
    expect(getScoreLabel(49)).toBe('Tidak Siap')
  })

  it('returns "Tidak Siap" for score 0', () => {
    expect(getScoreLabel(0)).toBe('Tidak Siap')
  })
})

describe('computeTopActions', () => {
  it('returns empty array when score >= 80', () => {
    const components = makeComponents({
      kelengkapanAlur: 90,
      kesiapanSprint: 85,
      kejelasanRequirement: 80,
      konteksBisnis: 75,
    })
    expect(computeTopActions(components, 80)).toEqual([])
  })

  it('returns up to 3 actions when score < 80', () => {
    const components = makeComponents({
      kelengkapanAlur: 40,
      kesiapanSprint: 30,
      kejelasanRequirement: 50,
      konteksBisnis: 60,
    })
    const actions = computeTopActions(components, 42)
    expect(actions.length).toBeGreaterThanOrEqual(1)
    expect(actions.length).toBeLessThanOrEqual(3)
  })

  it('returns actions sorted by lowest component score first', () => {
    const components = makeComponents({
      kelengkapanAlur: 80,
      kesiapanSprint: 20, // lowest
      kejelasanRequirement: 60,
      konteksBisnis: 40, // second lowest
    })
    const actions = computeTopActions(components, 55)
    // First action should relate to kesiapanSprint (lowest score)
    expect(actions[0]).toContain('engineering')
    // Second action should relate to konteksBisnis
    expect(actions[1]).toContain('konteks bisnis')
  })

  it('all actions are non-empty strings', () => {
    const components = makeComponents({
      kelengkapanAlur: 30,
      kesiapanSprint: 40,
      kejelasanRequirement: 50,
      konteksBisnis: 20,
    })
    const actions = computeTopActions(components, 36)
    for (const action of actions) {
      expect(action).toBeTruthy()
      expect(typeof action).toBe('string')
      expect(action.length).toBeGreaterThan(0)
    }
  })

  it('returns at least 1 action when score < 80', () => {
    const components = makeComponents({
      kelengkapanAlur: 70,
      kesiapanSprint: 70,
      kejelasanRequirement: 70,
      konteksBisnis: 70,
    })
    const actions = computeTopActions(components, 70)
    expect(actions.length).toBeGreaterThanOrEqual(1)
  })
})
