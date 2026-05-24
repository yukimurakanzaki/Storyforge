# Implementation Plan: SSE Streaming

## Overview

Convert `/api/analyze` and `/api/refine` from buffered JSON responses to Server-Sent Events streaming. Work proceeds in four stages: (1) shared SSE utilities, (2) server route conversion, (3) client consumption, (4) UI streaming feedback. Each task is scoped to under 45 minutes.

---

## Tasks

- [x] 1. Create shared SSE server utility (`lib/sse.ts`)
  - Create `lib/sse.ts` exporting `sseEvent(name, data)` and `createSSEStream()`
  - `sseEvent` returns the exact wire format: `event: <name>\ndata: <JSON>\n\n`
  - `createSSEStream` returns `{ readable, enqueue, close, error }` using `ReadableStream` + `TextEncoder`
  - The `error` helper writes `event: error` then calls `close()`
  - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 1.1 Write property test for `sseEvent` encoding round-trip
    - **Property 1: SSE event encoding round-trip**
    - Generate random event names and JSON-serializable data objects
    - Parse the output of `sseEvent(name, data)` and verify name and data are recovered exactly
    - **Validates: Requirements 8.1, 8.3**

  - [x]* 1.2 Write property test for `sseEvent` delta chunk fidelity
    - **Property 2: SSE delta events contain only the emitted chunk**
    - Generate random string chunks (including Unicode, newlines, special chars)
    - Verify the encoded delta event contains exactly the original chunk in the `text` field
    - **Validates: Requirements 1.2, 4.2**

- [x] 2. Create shared SSE client utility (`lib/sse-client.ts`)
  - Create `lib/sse-client.ts` exporting `readSSEStream(response: Response): AsyncGenerator<SSEEvent>`
  - Parse chunked `text/event-stream` bytes: split on `\n\n`, extract `event:` and `data:` lines
  - Handle partial chunks across `reader.read()` calls using a string buffer
  - Call `reader.releaseLock()` in a `finally` block
  - _Requirements: 6.1, 7.1_

  - [x]* 2.1 Write property test for SSE client parser correctness
    - **Property 4: SSE client parser correctness**
    - Generate random sequences of `{ name, data }` pairs, encode with `sseEvent`, feed through `readSSEStream` via a mock `Response`
    - Verify the yielded sequence matches the input sequence exactly
    - **Validates: Requirements 6.1, 7.1**

  - [x]* 2.2 Write property test for stream accumulation round-trip
    - **Property 3: SSE stream accumulation round-trip**
    - Generate random arrays of string chunks that together form valid JSON
    - Verify that `chunks.join('')` parsed equals the result of accumulating chunks one-by-one
    - **Validates: Requirements 1.3, 4.3**

- [x] 3. Checkpoint — Verify utilities compile and tests pass
  - Ensure `lib/sse.ts` and `lib/sse-client.ts` have no TypeScript errors
  - Ensure all property tests pass
  - Ask the user if questions arise before proceeding to route conversion.

- [x] 4. Convert `/api/analyze` to SSE streaming
  - Replace `await anthropic.messages.create(...)` with `anthropic.messages.stream(...)`
  - Import `sseEvent` and `createSSEStream` from `lib/sse.ts`
  - Return `new Response(readable, { headers })` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Mode: <mode>`
  - Run the Anthropic stream in a background async IIFE (do not await before returning `Response`)
  - For each `content_block_delta` / `text_delta` event: accumulate text, call `enqueue(sseEvent('delta', { text: chunk }))`
  - On stream end: clean and parse accumulated JSON, call `incrementUsage` + `logAnalysisEvent('analysis_completed')` for authenticated users, then `enqueue(sseEvent('done', parsed))` + `close()`
  - On any error in the IIFE: call `streamError('Terjadi kesalahan. Coba lagi.')`
  - Keep all pre-stream logic unchanged: auth check, guest rate-limit, `checkUsage`, body validation, `logAnalysisEvent('analysis_started')`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

  - [x]* 4.1 Write unit tests for analyze route pre-stream error paths
    - Test 401 returned when no auth session (user mode)
    - Test 429 returned when guest rate-limit exceeded
    - Test 429 + `X-Limit-Reached: true` when usage limit reached
    - Test 400 for missing/empty `text`, 413 for oversized `text`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 4.2 Write unit test for usage tracking on done vs error
    - **Property 5: Error events never trigger usage increment**
    - Mock Anthropic to throw — verify `incrementUsage` is NOT called
    - Mock Anthropic to succeed — verify `incrementUsage` IS called after `event: done`
    - **Validates: Requirements 3.1, 3.2**

- [x] 5. Convert `/api/refine` to SSE streaming
  - Replace `await anthropic.messages.create(...)` with `anthropic.messages.stream(...)`
  - Import `sseEvent` and `createSSEStream` from `lib/sse.ts`
  - Return `new Response(readable, { headers })` with `Content-Type: text/event-stream`, `Cache-Control: no-cache`
  - Run the Anthropic stream in a background async IIFE
  - For each `content_block_delta` / `text_delta` event: accumulate text, `enqueue(sseEvent('delta', { text: chunk }))`
  - On stream end: clean and parse accumulated JSON, `enqueue(sseEvent('done', { message, readyToFinalize, analysis }))` + `close()`
  - On any error: call `streamError('Terjadi kesalahan. Coba lagi.')`
  - Keep all pre-stream logic unchanged: guest rate-limit, auth check, body validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

  - [x]* 5.1 Write unit tests for refine route pre-stream error paths
    - Test 401 for missing auth, 429 for guest rate-limit
    - Test 400 for missing `brdText`, `initialAnalysis`, `messages`; 413 for oversized BRD; 400 for last message not from user
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Checkpoint — Verify both routes compile and manual smoke test passes
  - Run `tsc --noEmit` to confirm no TypeScript errors in both routes
  - Confirm `export const runtime = 'nodejs'` is present in both routes
  - Ask the user if questions arise before proceeding to client updates.

- [x] 7. Add `isStreaming` to `ChatMessage` type
  - In `types/index.ts` (or wherever `ChatMessage` is defined), add `isStreaming?: boolean`
  - This flag lets `RefinementChat` render a streaming cursor on the in-progress assistant message
  - _Requirements: 7.2, 7.3_

- [x] 8. Update `AnalyzePage` — `handleAnalyze` to consume SSE stream
  - Add `streamingText: string` state (initialized to `''`)
  - Import `readSSEStream` from `lib/sse-client.ts`
  - Replace `await res.json()` with a `for await` loop over `readSSEStream(res)`
  - On `delta` event: `setStreamingText(prev => prev + chunk)`
  - On `done` event: build `analysisResult` from `event.data`, call `incrementGuestUsage()` if guest, transition to `'refining'`
  - On `error` event: set error message, transition to `'input'`
  - Keep pre-stream non-2xx handling: `if (!res.ok) { const body = await res.json()... }`
  - Reset `streamingText` to `''` at the start of each new analysis
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Update `AnalyzingState` component to show streaming text
  - Pass `streamingText: string` prop to `AnalyzingState` (or inline in `AnalyzePage`)
  - When `streamingText` is non-empty, render it in a scrollable pre/div below the spinner
  - Keep the spinner and "Menganalisis BRD..." label visible while streaming
  - _Requirements: 6.2_

- [x] 10. Update `AnalyzePage` — `callRefineAPI` to consume SSE stream
  - Import `readSSEStream` from `lib/sse-client.ts`
  - Before the fetch, append a placeholder `{ role: 'assistant', content: '', isStreaming: true }` message to `messages`
  - Replace `await res.json()` with a `for await` loop over `readSSEStream(res)`
  - On `delta` event: update the last message in state with accumulated content and `isStreaming: true`
  - On `done` event: replace the streaming placeholder with `{ role: 'assistant', content: parsed.message, isStreaming: false }`, update `result` and `foundationData` from `parsed.analysis`
  - On `error` event: remove the placeholder message, set error
  - Keep pre-stream non-2xx handling unchanged
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 11. Update `RefinementChat` to render streaming cursor
  - In the assistant message renderer, check `message.isStreaming`
  - When `isStreaming` is true, append a blinking cursor character (e.g., `▋`) after the content
  - When `isStreaming` is false or undefined, render normally
  - _Requirements: 7.2_

- [x] 12. Final checkpoint — End-to-end verification
  - Run `tsc --noEmit` across the project — zero errors expected
  - Run all unit and property tests — all pass
  - Verify `lib/sse.ts`, `lib/sse-client.ts`, both routes, `analyze/page.tsx`, and `RefinementChat` are consistent
  - Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `export const runtime = 'nodejs'` must remain on both routes — the `ReadableStream` pattern requires the Node.js runtime, not Edge
- The background async IIFE pattern (tasks 4 and 5) is the standard Next.js App Router approach for streaming: return the `Response` immediately, let the IIFE write to the stream
- `lib/anthropic.ts` is unchanged — the ZDR header is already set on the shared client
- Pre-stream JSON error responses (auth, validation) are unchanged — only the success path switches to SSE
- Guest mode: `incrementGuestUsage()` moves to the client-side `done` event handler (task 8), matching the previous post-`res.json()` call site
