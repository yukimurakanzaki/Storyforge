# Design Document — SSE Streaming

## Overview

Convert `/api/analyze` and `/api/refine` from buffered `anthropic.messages.create(...)` to streaming `anthropic.messages.stream(...)`, emitting Server-Sent Events to the client. A shared utility module handles SSE encoding and stream construction. The client (`analyze/page.tsx`) is updated to consume the stream with `fetch` + `ReadableStream` reader, rendering tokens as they arrive.

No changes are needed to `lib/anthropic.ts` (ZDR header already set), Supabase auth helpers, usage tracking functions, or validation logic — only the response construction and client consumption patterns change.

---

## Architecture

```
Client (analyze/page.tsx)
  │
  │  POST /api/analyze  (fetch, ReadableStream reader)
  ▼
AnalyzeRoute (app/api/analyze/route.ts)
  │  1. Auth / rate-limit / validation  →  JSON error (400/401/413/429)
  │  2. logAnalysisEvent('analysis_started')
  │  3. anthropic.messages.stream(...)
  │  4. For each text delta  →  SSE delta event
  │  5. On stream end: parse JSON  →  SSE done event
  │                                    incrementUsage + logAnalysisEvent('analysis_completed')
  │  6. On error  →  SSE error event  (no usage increment)
  ▼
StreamingResponse  (Content-Type: text/event-stream)

Client (analyze/page.tsx)
  │
  │  POST /api/refine  (fetch, ReadableStream reader)
  ▼
RefineRoute (app/api/refine/route.ts)
  │  1. Auth / rate-limit / validation  →  JSON error
  │  2. anthropic.messages.stream(...)
  │  3. For each text delta  →  SSE delta event
  │  4. On stream end: parse JSON  →  SSE done event
  │  5. On error  →  SSE error event
  ▼
StreamingResponse  (Content-Type: text/event-stream)
```

---

## Shared SSE Utility — `lib/sse.ts`

This module is the single source of truth for SSE wire format. Both routes import from here.

### Interface

```typescript
/**
 * Encode a named SSE event with a JSON data payload.
 * Returns the exact bytes to write to the stream.
 *
 * Wire format:
 *   event: <name>\n
 *   data: <JSON.stringify(data)>\n
 *   \n
 */
export function sseEvent(name: string, data: unknown): string

/**
 * Create a { readable, controller } pair for use as a streaming Response body.
 * The controller exposes enqueue(chunk: string) and close().
 */
export function createSSEStream(): {
  readable: ReadableStream<Uint8Array>
  enqueue: (chunk: string) => void
  close: () => void
  error: (msg: string) => void   // writes event: error then closes
}
```

### Implementation

```typescript
// lib/sse.ts
const encoder = new TextEncoder()

export function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

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
      controller.enqueue(encoder.encode(chunk))
    },
    close() {
      controller.close()
    },
    error(msg: string) {
      controller.enqueue(encoder.encode(sseEvent('error', { error: msg })))
      controller.close()
    },
  }
}
```

---

## Server Implementation — AnalyzeRoute

### Pattern

```typescript
// app/api/analyze/route.ts  (streaming section only — auth/validation unchanged)
export async function POST(request: NextRequest) {
  const mode = request.headers.get('x-guest-mode') === '1' ? 'guest' : 'user'

  // --- Pre-stream: auth, rate-limit, validation (return JSON errors as before) ---
  // ... (unchanged logic) ...

  // --- Log analysis_started for authenticated users ---
  if (user && supabase && sessionId !== undefined) {
    wordCount = validation.text.split(/\s+/).length
    await logAnalysisEvent(supabase, user.id, sessionId, 'analysis_started', wordCount)
    startTime = Date.now()
  }

  // --- Start SSE stream ---
  const { readable, enqueue, close, error: streamError } = createSSEStream()

  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Mode': mode,
  })

  // Run streaming in background (do not await — return Response immediately)
  ;(async () => {
    let accumulated = ''
    try {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Analisis BRD berikut...\n\n${validation.text}` }],
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          accumulated += event.delta.text
          enqueue(sseEvent('delta', { text: event.delta.text }))
        }
      }

      // Parse accumulated JSON
      const cleaned = accumulated
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim()
      const parsed = JSON.parse(cleaned)

      // Fire usage tracking before emitting done
      if (user && supabase && sessionId !== undefined) {
        await incrementUsage(supabase, user.id)
        await logAnalysisEvent(
          supabase, user.id, sessionId, 'analysis_completed',
          wordCount, startTime !== undefined ? Date.now() - startTime : undefined
        )
      }

      enqueue(sseEvent('done', parsed))
      close()
    } catch (err) {
      console.error('[api/analyze] stream error:', err)
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers: responseHeaders })
}
```

### Key Design Decisions

- The async IIFE runs the Anthropic stream in the background. The `Response` is returned immediately so Next.js can start flushing headers to the client.
- `incrementUsage` and `logAnalysisEvent('analysis_completed')` are called server-side inside the IIFE, after JSON parse succeeds, before `event: done` is written. This preserves the existing "only count successful analyses" invariant.
- Pre-stream errors (auth, validation) still return `NextResponse.json(...)` — no change to existing error paths.

---

## Server Implementation — RefineRoute

### Pattern

```typescript
// app/api/refine/route.ts  (streaming section only — auth/validation unchanged)
export async function POST(request: NextRequest) {
  // --- Pre-stream: auth, rate-limit, validation (return JSON errors as before) ---
  // ... (unchanged logic) ...

  const { readable, enqueue, close, error: streamError } = createSSEStream()

  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  })

  ;(async () => {
    let accumulated = ''
    try {
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 6000,
        temperature: 0,
        system: buildSystemPrompt(brdText, typedAnalysis, qaAnswers, turnNumber),
        messages: anthropicMessages,
      })

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          accumulated += event.delta.text
          enqueue(sseEvent('delta', { text: event.delta.text }))
        }
      }

      const cleaned = accumulated.replace(/```(?:json)?/gi, '').trim()
      const parsed: RefineResponse = JSON.parse(cleaned)

      enqueue(sseEvent('done', {
        message: parsed.message,
        readyToFinalize: parsed.readyToFinalize ?? false,
        analysis: parsed.analysis ?? null,
      }))
      close()
    } catch (err) {
      console.error('[api/refine] stream error:', err)
      streamError('Terjadi kesalahan. Coba lagi.')
    }
  })()

  return new Response(readable, { headers: responseHeaders })
}
```

---

## Client Implementation — SSE Stream Reader

### Shared Client Helper — `lib/sse-client.ts`

A lightweight parser that reads a `fetch` response body as a stream of SSE events.

```typescript
// lib/sse-client.ts

export interface SSEEvent {
  name: string
  data: unknown
}

/**
 * Async generator that yields parsed SSE events from a fetch Response.
 * Handles chunked delivery and multi-line buffering.
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
      buffer = parts.pop() ?? ''  // keep incomplete last chunk

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
```

### AnalyzePage — `handleAnalyze` (updated)

```typescript
async function handleAnalyze(text: string) {
  // ... guest usage check unchanged ...

  setPhase('analyzing')
  setStreamingText('')   // new state for token-by-token display
  // ... reset other state ...

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(!isAuthenticated ? { 'x-guest-mode': '1' } : {}),
      },
      body: JSON.stringify({ text: text + projectContextStr }),
    })

    // Pre-stream errors (401, 429, 400, 413) — still JSON
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? `Server error ${res.status}`)
      setPhase('input')
      return
    }

    for await (const event of readSSEStream(res)) {
      if (event.name === 'delta') {
        const { text: chunk } = event.data as { text: string }
        setStreamingText(prev => prev + chunk)
      } else if (event.name === 'done') {
        const parsed = event.data as AnalysisResult  // already parsed by server
        // ... build analysisResult, save session, transition to 'refining' ...
        if (!isAuthenticated) setGuestUsage(incrementGuestUsage())
        setPhase('refining')
      } else if (event.name === 'error') {
        const { error: msg } = event.data as { error: string }
        setError(msg)
        setPhase('input')
      }
    }
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.')
    setPhase('input')
  }
}
```

### AnalyzePage — `callRefineAPI` (updated)

```typescript
async function callRefineAPI(
  nextMessages: ChatMessage[],
  currentResult: AnalysisResult,
  currentBrdText: string
): Promise<void> {
  setIsRefining(true)
  setError(undefined)

  // Add a placeholder streaming message
  const streamingMsg: ChatMessage = { role: 'assistant', content: '', isStreaming: true }
  setMessages([...nextMessages, streamingMsg])

  try {
    const res = await fetch('/api/refine', { /* ... unchanged headers/body ... */ })

    if (!res.ok) {
      setMessages(nextMessages.slice(0, -1))
      setError('Gagal memproses. Coba lagi.')
      return
    }

    let streamedContent = ''

    for await (const event of readSSEStream(res)) {
      if (event.name === 'delta') {
        const { text: chunk } = event.data as { text: string }
        streamedContent += chunk
        // Update the streaming placeholder message in real time
        setMessages([...nextMessages, { role: 'assistant', content: streamedContent, isStreaming: true }])
      } else if (event.name === 'done') {
        const parsed = event.data as RefineAPIResponse
        const finalMessages: ChatMessage[] = [
          ...nextMessages,
          { role: 'assistant', content: parsed.message, isStreaming: false },
        ]
        setMessages(finalMessages)
        if (parsed.analysis) {
          // ... update result, foundationData, sessionState as before ...
        }
        // ... incrementRefinementRound, showAccountPrompt, persistAnalysisState ...
      } else if (event.name === 'error') {
        setMessages(nextMessages.slice(0, -1))
        setError('Gagal memproses. Coba lagi.')
      }
    }
  } catch (e) {
    setMessages(nextMessages.slice(0, -1))
    setError(e instanceof Error ? e.message : 'Gagal memproses. Coba lagi.')
  } finally {
    setIsRefining(false)
  }
}
```

### Streaming UI State

Add `streamingText: string` state to `AnalyzePage` for the analyze phase. The `AnalyzingState` component is updated to show the streaming text as it arrives.

Add `isStreaming?: boolean` to the `ChatMessage` type so `RefinementChat` can render a streaming cursor on the in-progress assistant message.

---

## Data Models

### SSE Wire Protocol

```
// delta event
event: delta
data: {"text":"<string>"}

// done event — analyze
event: done
data: {"gapList":[...],"clarificationQuestions":[...],"readinessScore":65,"readinessLabel":"Perlu Klarifikasi"}

// done event — refine
event: done
data: {"message":"<string>","readyToFinalize":false,"analysis":{...}}

// error event
event: error
data: {"error":"Terjadi kesalahan. Coba lagi."}
```

### Updated `ChatMessage` type

```typescript
// types/index.ts (or wherever ChatMessage is defined)
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean   // true while the assistant message is still being streamed
}
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Auth/rate-limit/validation failure | Regular JSON response (unchanged) — stream never starts |
| Anthropic API error after stream starts | `event: error` written, stream closed — no usage increment |
| JSON parse failure after stream ends | `event: error` written, stream closed — no usage increment |
| Network disconnect mid-stream | Client `fetch` reader throws; `catch` block shows error |
| Client navigates away mid-stream | `reader.releaseLock()` in `finally` cleans up; server IIFE completes or errors silently |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: SSE event encoding round-trip

For any event name string and any JSON-serializable data object, parsing the output of `sseEvent(name, data)` must recover the original name and data exactly.

**Validates: Requirements 8.1, 8.3, 1.2, 1.3, 4.2, 4.3**

### Property 2: SSE delta events contain only the emitted chunk

For any string chunk passed to `sseEvent('delta', { text: chunk })`, the encoded event must contain exactly that chunk in the `text` field — no truncation, no extra characters, no HTML encoding.

**Validates: Requirements 1.2, 4.2**

### Property 3: SSE stream accumulation round-trip

For any sequence of string chunks that together form a valid JSON object when concatenated, accumulating those chunks server-side and then parsing the result must produce an object equivalent to `JSON.parse(chunks.join(''))`.

**Validates: Requirements 1.3, 4.3**

### Property 4: SSE client parser correctness

For any sequence of SSE events encoded with `sseEvent`, feeding the concatenated bytes through `readSSEStream` must yield the same sequence of `{ name, data }` objects in the same order.

**Validates: Requirements 6.1, 7.1**

### Property 5: Error events never trigger usage increment

For any request that results in `event: error` being emitted (whether from Anthropic error or JSON parse failure), the `incrementUsage` function must not be called.

**Validates: Requirements 3.2**
