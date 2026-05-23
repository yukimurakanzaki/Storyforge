import Anthropic from '@anthropic-ai/sdk'

// ZDR (Zero Data Retention) requires account-level enablement at Anthropic.
// Set ANTHROPIC_ZDR_ENABLED=true in env to activate. Without it, this header
// causes a 400/403 and silently breaks every API call.
const defaultHeaders: Record<string, string> = {}
if (process.env.ANTHROPIC_ZDR_ENABLED === 'true') {
  defaultHeaders['anthropic-beta'] = 'zdr-2025-01-01'
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders,
})

export { Anthropic }
