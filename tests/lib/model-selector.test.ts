import { describe, it, expect } from 'vitest'
import { getModelConfig } from '@/lib/model-selector'
import type { AIProvider, ModelConfig } from '@/lib/model-selector'

describe('getModelConfig', () => {
  describe('free plan', () => {
    it('returns Google Gemini 2.0 Flash config', () => {
      const config = getModelConfig('free')

      expect(config.provider).toBe('google')
      expect(config.model).toBe('gemini-2.0-flash')
    })

    it('does not include extra headers', () => {
      const config = getModelConfig('free')

      expect(config.headers).toBeUndefined()
    })
  })

  describe('pro plan', () => {
    it('returns Anthropic Claude Haiku 4.5 config', () => {
      const config = getModelConfig('pro')

      expect(config.provider).toBe('anthropic')
      expect(config.model).toBe('claude-haiku-4-5-20251001')
    })

    it('includes the ZDR beta header', () => {
      const config = getModelConfig('pro')

      expect(config.headers).toBeDefined()
      expect(config.headers!['anthropic-beta']).toBe('zdr-2025-01-01')
    })
  })

  describe('defensive fallback', () => {
    it('defaults to free config for unknown plan values', () => {
      // TypeScript would normally prevent this, but testing runtime safety
      const config = getModelConfig('unknown' as 'free' | 'pro')

      expect(config.provider).toBe('google')
      expect(config.model).toBe('gemini-2.0-flash')
    })
  })

  describe('type exports', () => {
    it('AIProvider type accepts google and anthropic', () => {
      const google: AIProvider = 'google'
      const anthropic: AIProvider = 'anthropic'

      expect(google).toBe('google')
      expect(anthropic).toBe('anthropic')
    })

    it('ModelConfig interface shape is correct', () => {
      const config: ModelConfig = {
        provider: 'google',
        model: 'test-model',
      }

      expect(config).toHaveProperty('provider')
      expect(config).toHaveProperty('model')
    })
  })
})
