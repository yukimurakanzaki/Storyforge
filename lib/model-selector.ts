/**
 * Model Selector — Tiered AI model configuration based on user plan.
 *
 * Pure function with no database access. Returns the correct AI provider
 * and model configuration for the given subscription plan.
 */

export type AIProvider = 'google' | 'anthropic'

export interface ModelConfig {
  provider: AIProvider
  model: string
  /** Additional headers (e.g., ZDR for Anthropic) */
  headers?: Record<string, string>
}

/**
 * Returns the AI model configuration based on user's subscription plan.
 * Pure function — no database access.
 *
 * - free → Google Gemini 2.0 Flash
 * - pro → Anthropic Claude Haiku 4.5 with ZDR header
 * - unknown plan → defaults to free config (defensive fallback)
 */
export function getModelConfig(plan: 'free' | 'pro'): ModelConfig {
  switch (plan) {
    case 'pro':
      return {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        headers: { 'anthropic-beta': 'zdr-2025-01-01' },
      }
    case 'free':
    default:
      return {
        provider: 'google',
        model: 'gemini-2.0-flash',
      }
  }
}
