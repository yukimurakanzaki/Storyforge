import { describe, it, expect } from 'vitest'
import { getUsageColorClass, formatUsageText } from '@/components/analyze/UsageCounter'

describe('UsageCounter', () => {
  describe('formatUsageText', () => {
    it('formats usage as "{used}/{limit} analisis"', () => {
      expect(formatUsageText(1, 3)).toBe('1/3 analisis')
      expect(formatUsageText(0, 50)).toBe('0/50 analisis')
      expect(formatUsageText(25, 50)).toBe('25/50 analisis')
    })
  })

  describe('getUsageColorClass', () => {
    it('returns green when remaining > 50%', () => {
      // 0 used out of 10 → 100% remaining
      expect(getUsageColorClass(0, 10)).toBe('text-green-600')
      // 4 used out of 10 → 60% remaining
      expect(getUsageColorClass(4, 10)).toBe('text-green-600')
    })

    it('returns yellow when remaining is between 25% and 50% (inclusive)', () => {
      // 5 used out of 10 → 50% remaining (boundary)
      expect(getUsageColorClass(5, 10)).toBe('text-yellow-600')
      // 7 used out of 10 → 30% remaining
      expect(getUsageColorClass(7, 10)).toBe('text-yellow-600')
      // 3 used out of 4 → 25% remaining (lower boundary)
      expect(getUsageColorClass(3, 4)).toBe('text-yellow-600')
    })

    it('returns red when remaining < 25%', () => {
      // 9 used out of 10 → 10% remaining
      expect(getUsageColorClass(9, 10)).toBe('text-red-600')
      // 3 used out of 3 → 0% remaining
      expect(getUsageColorClass(3, 3)).toBe('text-red-600')
      // 19 used out of 20 → 5% remaining
      expect(getUsageColorClass(19, 20)).toBe('text-red-600')
    })

    it('handles exact boundary at 50% correctly (yellow)', () => {
      // 50% remaining → should be yellow (25% <= remaining <= 50%)
      expect(getUsageColorClass(50, 100)).toBe('text-yellow-600')
    })

    it('handles just above 50% correctly (green)', () => {
      // 51% remaining → should be green
      expect(getUsageColorClass(49, 100)).toBe('text-green-600')
    })

    it('handles exact boundary at 25% correctly (yellow)', () => {
      // 25% remaining → should be yellow (inclusive)
      expect(getUsageColorClass(75, 100)).toBe('text-yellow-600')
    })

    it('handles just below 25% correctly (red)', () => {
      // 24% remaining → should be red
      expect(getUsageColorClass(76, 100)).toBe('text-red-600')
    })
  })
})
