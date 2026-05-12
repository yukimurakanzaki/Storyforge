const encoder = new TextEncoder()

/**
 * Encode a named SSE event with a JSON data payload.
 * Returns the exact wire format string to write to the stream.
 *
 * Wire format:
 *   event: <name>\n
 *   data: <JSON.stringify(data)>\n
 *   \n
 */
export function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * Create a { readable, enqueue, close, error } tuple for use as a
 * streaming Response body in Next.js App Router (Node.js runtime).
 */
export function createSSEStream() {
  let controller: ReadableStreamDefaultController<Uint8Array>

  const readable = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  return {
    readable,
    enqueue(chunk: string) {
      try { controller.enqueue(encoder.encode(chunk)) } catch { /* stream closed by client */ }
    },
    close() {
      try { controller.close() } catch { /* already closed */ }
    },
    /** Writes an `event: error` SSE event then closes the stream. */
    error(msg: string) {
      try {
        controller.enqueue(encoder.encode(sseEvent('error', { error: msg })))
        controller.close()
      } catch { /* stream closed by client */ }
    },
  }
}
