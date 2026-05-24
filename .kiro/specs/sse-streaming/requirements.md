# Requirements Document

## Introduction

This feature converts the `/api/analyze` and `/api/refine` API routes from buffered JSON responses to Server-Sent Events (SSE) streaming. Currently both routes use `anthropic.messages.create(...)` which buffers the entire Anthropic response before returning, causing 15–30 second spinners with no feedback. The goal is to stream tokens to the client as they arrive, giving users immediate visual feedback, while preserving all existing auth, validation, usage-tracking, and guest-mode behavior.

## Glossary

- **SSE**: Server-Sent Events — a unidirectional HTTP streaming protocol where the server pushes `text/event-stream` events to the client over a single long-lived connection.
- **AnalyzeRoute**: The Next.js App Router handler at `app/api/analyze/route.ts`.
- **RefineRoute**: The Next.js App Router handler at `app/api/refine/route.ts`.
- **AnalyzePage**: The client component at `app/(app)/analyze/page.tsx` that calls both routes.
- **StreamingResponse**: A `Response` object with `Content-Type: text/event-stream` backed by a `ReadableStream`.
- **delta event**: An SSE event with `event: delta` carrying `{"text": "<chunk>"}` — emitted for each text token received from Anthropic.
- **done event**: An SSE event with `event: done` carrying the fully parsed JSON result — emitted once after the stream ends and JSON is parsed server-side.
- **error event**: An SSE event with `event: error` carrying `{"error": "<message>"}` — emitted when an Anthropic or JSON-parse error occurs after the stream has started.
- **AnthropicStream**: The streaming object returned by `anthropic.messages.stream(...)`.
- **UsageTracker**: The server-side functions `checkUsage`, `incrementUsage`, and `logAnalysisEvent` in `lib/usage.ts`.
- **GuestRateLimiter**: The server-side function `checkGuestRateLimit` in `lib/guest-rate-limit.ts`.

---

## Requirements

### Requirement 1 — Analyze Route: SSE Streaming Response

**User Story:** As a PM using StoryForge, I want the BRD analysis to stream tokens to my screen as they arrive, so that I see progress immediately instead of waiting 15–30 seconds for a blank spinner.

#### Acceptance Criteria

1. WHEN the AnalyzeRoute receives a valid POST request, THE AnalyzeRoute SHALL return a `Response` with `Content-Type: text/event-stream` and `Cache-Control: no-cache`.
2. WHEN the AnthropicStream emits a text delta, THE AnalyzeRoute SHALL write an SSE event in the format `event: delta\ndata: {"text": "<chunk>"}\n\n` to the stream.
3. WHEN the AnthropicStream completes, THE AnalyzeRoute SHALL parse the accumulated text as JSON, then write an SSE event in the format `event: done\ndata: <parsed JSON>\n\n` and close the stream.
4. WHEN a JSON parse error occurs after the stream has started, THE AnalyzeRoute SHALL write an SSE event in the format `event: error\ndata: {"error": "Terjadi kesalahan. Coba lagi."}\n\n` and close the stream.
5. WHEN an Anthropic API error occurs after the stream has started, THE AnalyzeRoute SHALL write an SSE event in the format `event: error\ndata: {"error": "Terjadi kesalahan. Coba lagi."}\n\n` and close the stream.
6. THE AnalyzeRoute SHALL include an `X-Mode` response header set to `"guest"` or `"user"` on the streaming response.

### Requirement 2 — Analyze Route: Pre-Stream Validation (Unchanged)

**User Story:** As a PM, I want auth and validation errors to be returned immediately as JSON (not SSE), so that the client can handle them with existing error-handling logic.

#### Acceptance Criteria

1. WHEN the request is in guest mode and the GuestRateLimiter denies the request, THE AnalyzeRoute SHALL return a regular JSON response with HTTP status 429 before starting the stream.
2. WHEN the request is in user mode and no authenticated Supabase session exists, THE AnalyzeRoute SHALL return a regular JSON response with HTTP status 401 before starting the stream.
3. WHEN the UsageTracker reports the user has reached their limit, THE AnalyzeRoute SHALL return a regular JSON response with HTTP status 429 and an `X-Limit-Reached: true` header before starting the stream.
4. WHEN the request body is invalid JSON, THE AnalyzeRoute SHALL return a regular JSON response with HTTP status 400 before starting the stream.
5. WHEN the `text` field is missing, empty, or exceeds 150,000 characters, THE AnalyzeRoute SHALL return a regular JSON response with the appropriate HTTP status (400 or 413) before starting the stream.

### Requirement 3 — Analyze Route: Usage Tracking on Stream Completion

**User Story:** As a system operator, I want usage to be incremented and the completion event logged only after a successful stream, so that failed or aborted analyses are not counted against the user's quota.

#### Acceptance Criteria

1. WHEN the AnalyzeRoute emits `event: done` for an authenticated user, THE UsageTracker SHALL call `incrementUsage` and `logAnalysisEvent('analysis_completed')` server-side before closing the stream.
2. WHEN the AnalyzeRoute emits `event: error`, THE UsageTracker SHALL NOT call `incrementUsage`.
3. WHEN the request is in guest mode, THE AnalyzeRoute SHALL NOT call `incrementUsage` or `logAnalysisEvent`.
4. WHEN the AnalyzeRoute begins streaming for an authenticated user, THE UsageTracker SHALL call `logAnalysisEvent('analysis_started')` before the first delta event is written.

### Requirement 4 — Refine Route: SSE Streaming Response

**User Story:** As a PM in the refinement chat, I want the assistant's reply to stream token-by-token, so that I see the response building in real time instead of waiting for the full reply.

#### Acceptance Criteria

1. WHEN the RefineRoute receives a valid POST request, THE RefineRoute SHALL return a `Response` with `Content-Type: text/event-stream` and `Cache-Control: no-cache`.
2. WHEN the AnthropicStream emits a text delta, THE RefineRoute SHALL write an SSE event in the format `event: delta\ndata: {"text": "<chunk>"}\n\n` to the stream.
3. WHEN the AnthropicStream completes, THE RefineRoute SHALL parse the accumulated text as JSON, then write an SSE event in the format `event: done\ndata: {"message": "...", "readyToFinalize": <bool>, "analysis": {...}}\n\n` and close the stream.
4. WHEN a JSON parse error occurs after the stream has started, THE RefineRoute SHALL write an SSE event in the format `event: error\ndata: {"error": "Terjadi kesalahan. Coba lagi."}\n\n` and close the stream.
5. WHEN an Anthropic API error occurs after the stream has started, THE RefineRoute SHALL write an SSE event in the format `event: error\ndata: {"error": "Terjadi kesalahan. Coba lagi."}\n\n` and close the stream.

### Requirement 5 — Refine Route: Pre-Stream Validation (Unchanged)

**User Story:** As a PM, I want auth and validation errors on the refine route to be returned as regular JSON, so that the client can handle them consistently.

#### Acceptance Criteria

1. WHEN the request is in guest mode and the GuestRateLimiter denies the request, THE RefineRoute SHALL return a regular JSON response with HTTP status 429 before starting the stream.
2. WHEN the request is in user mode and no authenticated Supabase session exists, THE RefineRoute SHALL return a regular JSON response with HTTP status 401 before starting the stream.
3. WHEN the request body fails validation (missing `brdText`, `initialAnalysis`, `messages`, oversized payload, or last message not from user), THE RefineRoute SHALL return a regular JSON response with the appropriate HTTP status before starting the stream.

### Requirement 6 — AnalyzePage: SSE Client for Analyze

**User Story:** As a PM, I want the analyze page to consume the SSE stream and show tokens appearing in real time, so that I get immediate feedback during the analysis phase.

#### Acceptance Criteria

1. WHEN the AnalyzePage calls `/api/analyze`, THE AnalyzePage SHALL use `fetch` with a `ReadableStream` reader to consume the `text/event-stream` response instead of `await res.json()`.
2. WHEN the AnalyzePage receives a `delta` event, THE AnalyzePage SHALL accumulate the delta text and display streaming progress to the user.
3. WHEN the AnalyzePage receives a `done` event, THE AnalyzePage SHALL parse the event data as the final `AnalysisResult` and transition the phase from `'analyzing'` to `'refining'`.
4. WHEN the AnalyzePage receives an `error` event, THE AnalyzePage SHALL display the error message and transition the phase back to `'input'`.
5. WHEN the AnalyzePage receives a non-2xx HTTP response before the stream starts (auth/validation errors), THE AnalyzePage SHALL parse the response as JSON and display the error, preserving existing error-handling behavior.
6. WHEN the AnalyzePage is in guest mode, THE AnalyzePage SHALL call `incrementGuestUsage()` after receiving `event: done`, not before.

### Requirement 7 — AnalyzePage: SSE Client for Refine

**User Story:** As a PM in the refinement chat, I want the assistant's reply to appear token-by-token in the chat UI, so that the conversation feels responsive and alive.

#### Acceptance Criteria

1. WHEN the AnalyzePage calls `/api/refine`, THE AnalyzePage SHALL use `fetch` with a `ReadableStream` reader to consume the `text/event-stream` response.
2. WHEN the AnalyzePage receives a `delta` event from the refine stream, THE AnalyzePage SHALL append the delta text to a streaming assistant message visible in the chat UI.
3. WHEN the AnalyzePage receives a `done` event from the refine stream, THE AnalyzePage SHALL replace the streaming assistant message with the final `message` string and update `result` and `foundationData` from the `analysis` field.
4. WHEN the AnalyzePage receives an `error` event from the refine stream, THE AnalyzePage SHALL display the error and restore the message list to its pre-call state.
5. WHEN the AnalyzePage receives a non-2xx HTTP response before the refine stream starts, THE AnalyzePage SHALL parse the response as JSON and display the error.

### Requirement 8 — Shared SSE Utility

**User Story:** As a developer, I want a shared SSE helper so that both routes use identical event formatting and stream construction, reducing duplication and the risk of protocol inconsistencies.

#### Acceptance Criteria

1. THE system SHALL provide a shared utility function that encodes a named SSE event and its JSON data payload into the correct `event: <name>\ndata: <json>\n\n` wire format.
2. THE system SHALL provide a shared utility function that creates a `ReadableStream` / `TransformStream` controller pair suitable for use as a `Response` body in Next.js App Router Node.js runtime.
3. WHEN the shared utility is used by both AnalyzeRoute and RefineRoute, THE system SHALL produce byte-for-byte identical SSE framing for equivalent events.
