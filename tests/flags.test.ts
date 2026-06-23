import { describe, it, expect, afterEach } from 'vitest'
import { isUsageEnforcementEnabled } from '@/lib/flags'

describe('isUsageEnforcementEnabled (P0 kill-switch)', () => {
  const original = process.env.USAGE_ENFORCEMENT_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.USAGE_ENFORCEMENT_ENABLED
    else process.env.USAGE_ENFORCEMENT_ENABLED = original
  })

  it('defaults to ENABLED when unset (safe steady state)', () => {
    delete process.env.USAGE_ENFORCEMENT_ENABLED
    expect(isUsageEnforcementEnabled()).toBe(true)
  })

  it('stays enabled for any value other than the string "false"', () => {
    process.env.USAGE_ENFORCEMENT_ENABLED = 'true'
    expect(isUsageEnforcementEnabled()).toBe(true)
    process.env.USAGE_ENFORCEMENT_ENABLED = 'yes'
    expect(isUsageEnforcementEnabled()).toBe(true)
  })

  it('is disabled ONLY for exactly "false"', () => {
    process.env.USAGE_ENFORCEMENT_ENABLED = 'false'
    expect(isUsageEnforcementEnabled()).toBe(false)
  })
})
