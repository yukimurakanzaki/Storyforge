export interface SSEEvent {
  name: string
  data: unknown
}

/**
 * Async generator that yields parsed SSE events from a fetch Response.
 * Handles chunked delivery and multi-line buffering across reader.read() calls.
 *
 * Requirements: 6.1, 7.1
 */
export async function* readSSEStream(response: Response): AsyncGenerator<SSEEvent> {
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? '' // keep incomplete last chunk

      for (const part of parts) {
        const lines = part.split('\n')
        let eventName = 'message'
        let dataLine = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) eventName = line.slice(7).trim()
          if (line.startsWith('data: ')) dataLine = line.slice(6).trim()
        }

        if (dataLine) {
          yield { name: eventName, data: JSON.parse(dataLine) }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
