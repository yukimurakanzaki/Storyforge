/**
 * Reject a promise if it does not settle within `ms`. Used to put a hard
 * server-side ceiling on model calls so a hung upstream request can't keep an
 * SSE stream open indefinitely. The timer is always cleared so a slow-but-OK
 * promise never triggers a late rejection.
 */
export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
