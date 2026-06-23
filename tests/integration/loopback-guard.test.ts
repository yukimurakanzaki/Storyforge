import { describe, it, expect } from 'vitest'
import { assertLoopbackUrl, isLoopbackHost } from './loopback-guard'

describe('assertLoopbackUrl (local gauntlet safety)', () => {
  it('allows loopback hosts', () => {
    for (const u of ['http://localhost:54321', 'http://127.0.0.1:54321', 'http://[::1]:54321']) {
      expect(() => assertLoopbackUrl(u)).not.toThrow()
    }
  })

  it('rejects cloud / non-loopback hosts (incl. lookalike subdomains)', () => {
    for (const u of [
      'https://shnbucctqnaruflfdszg.supabase.co',
      'http://10.0.0.5:54321',
      'http://db.example.com',
      'https://127.0.0.1.evil.com',
      'http://localhost.evil.com',
    ]) {
      expect(() => assertLoopbackUrl(u)).toThrow()
    }
  })

  it('rejects invalid / missing URLs', () => {
    expect(() => assertLoopbackUrl('not a url')).toThrow()
    expect(() => assertLoopbackUrl(undefined)).toThrow()
    expect(() => assertLoopbackUrl('')).toThrow()
  })

  it('isLoopbackHost matches only the three allowed hosts', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true)
    expect(isLoopbackHost('localhost')).toBe(true)
    expect(isLoopbackHost('[::1]')).toBe(true)
    expect(isLoopbackHost('8.8.8.8')).toBe(false)
    expect(isLoopbackHost('127.0.0.1.evil.com')).toBe(false)
  })
})
