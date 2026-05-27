/**
 * Model Selector — Tiered AI model configuration based on user plan.
 *
 * Pure function with no database access. Returns the correct AI provider
 * and model configuration for the given subscription plan.
 */

export type AIProvider = 'anthropic'

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
 * Both tiers use Anthropic Claude Haiku 4.5 for simplicity (single provider).
 * Pro tier gets ZDR header for zero data retention.
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
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
      }
  }
}
