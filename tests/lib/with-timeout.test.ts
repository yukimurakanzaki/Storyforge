import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout, TimeoutError } from '@/lib/with-timeout'

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves with the value when the promise settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok')
  })

  it('rejects with TimeoutError when the promise does not settle in time', async () => {
    const never = new Promise<string>(() => {})
    const result = withTimeout(never, 1000)
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })

  it('propagates the original rejection when the promise rejects before the timeout', async () => {
    const boom = Promise.reject(new Error('boom'))
    await expect(withTimeout(boom, 1000)).rejects.toThrow('boom')
  })
})
