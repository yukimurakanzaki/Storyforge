# Iterative Refinement & Requirements Generation
**Date:** 2026-04-14  
**Status:** Approved  
**Feature:** Post-analysis chat loop → Jira Epic/Story export  

---

## 1. Overview

Extend the `/analyze` page with an iterative refinement loop. After the initial BRD gap analysis, the user answers clarification questions in a chat thread. Claude asks follow-up questions until it has enough context, then signals readiness. The user confirms, Claude generates a Jira-style Epic + Story breakdown, and the user exports it as markdown or copies it to clipboard.

The full session (BRD, analysis, conversation, requirements) is saved to `analysis_history` in Supabase.

---

## 2. User Workflow

```
Paste BRD → Analyze → Read gap analysis
  → Answer clarification questions (chat)
  → Claude asks follow-ups OR signals readiness
  → User clicks "Finalize Requirements"
  → Review Epic/Story breakdown
  → Copy to clipboard OR download .md
```

---

## 3. Page Phases (State Machine)

| Phase | Description |
|---|---|
| `input` | Default. BRD textarea + Analyze button visible. |
| `analyzing` | Streaming gap analysis in progress. |
| `refining` | Analysis done. Chat thread visible. User answering questions. |
| `finalizing` | User clicked Finalize. Requirements being generated. |
| `done` | Requirements displayed. Export controls visible. Session saved. |

Transitions:
- `input` → `analyzing`: user clicks Analyze
- `analyzing` → `refining`: stream completes, analysis parsed
- `refining` → `finalizing`: user clicks Finalize (only enabled when `readyToFinalize === true` OR user overrides)
- `finalizing` → `done`: requirements stream completes, Supabase save succeeds

---

## 4. UI Layout

### Phase: `input` / `analyzing`
Two-column grid (existing layout):
- Left: `BRDInput` component
- Right: `OutputPanel` (empty or loading)

### Phase: `refining`
Two-column grid:
- Left: collapsed BRD summary card ("BRD yang dianalisis: N paragraf / N kata") + `RefinementChat` component below it
- Right: `OutputPanel` (analysis results — readiness score + gap list, static)

### Phase: `finalizing` / `done`
Two-column grid:
- Left: `RefinementChat` (read-only, input disabled)
- Right: `RequirementsPanel` (loading skeleton → Epic/Story display + `RequirementsExport` bar at top)

---

## 5. New Components

### `RefinementChat`
- Renders `ChatMessage[]` as a thread (assistant messages left-aligned, user right-aligned)
- Claude's first message is constructed **client-side** from `initialAnalysis.clarificationQuestions` (joined as a numbered list intro: "Berdasarkan analisis BRD kamu, ada beberapa hal yang perlu klarifikasi:"). No API call for this first message — it seeds the `messages` array before any `/api/refine` call.
- Text input + Send button at bottom
- "Finalize Requirements" button appears when `readyToFinalize === true`; always visible as disabled with tooltip "Claude belum yakin requirement sudah cukup" before that
- Input and Send disabled during `finalizing` and `done` phases
- Props: `messages`, `onSend(text)`, `readyToFinalize`, `onFinalize`, `disabled`

### `RequirementsPanel`
- Shows Epic list, each expandable to show Stories
- Each Story shows: title, description, acceptance criteria (bulleted)
- `RequirementsExport` bar at top: `[Copy semua]` `[Download .md]`
- Props: `requirements`, `isLoading`

### `RequirementsExport`
- **Copy**: copies full markdown string to clipboard via `navigator.clipboard.writeText`
- **Download**: creates a Blob, triggers `<a download="requirements.md">` click
- Markdown format: `# [Epic Title]\n## [Story Title]\n### Acceptance Criteria\n- ...`
- Props: `requirements`

---

## 6. New API Routes

### `POST /api/refine`

**Purpose:** One turn of the refinement conversation.

**Request:**
```json
{
  "brdText": "string",
  "initialAnalysis": { ...AnalysisResult },
  "messages": [ { "role": "user|assistant", "content": "string" } ]
}
```

**Response:** Accumulate → parse JSON (same pattern as `/api/analyze`):
```json
{
  "message": "string (Claude's reply in Bahasa Indonesia)",
  "readyToFinalize": false
}
```

**System prompt behavior:**
- Claude acts as a requirements analyst continuing from the initial analysis
- Asks focused follow-up questions based on user answers
- When gaps are resolved, sets `readyToFinalize: true` and explains what it now has enough context for
- Maximum 5 assistant turns before Claude is forced to signal readiness (prevent infinite loops). A "turn" = one `[user message → assistant response]` exchange. Enforced by passing the turn count in the system prompt context.
- `outputTemplate` field accepted but unused in v1 (reserved for Pro template feature)

### `POST /api/requirements`

**Purpose:** Generate final Epic/Story breakdown from full conversation context.

**Request:**
```json
{
  "brdText": "string",
  "initialAnalysis": { ...AnalysisResult },
  "messages": [ ...full conversation ],
  "outputTemplate": "string (optional, defaults to Jira Epic/Story format)"
}
```

**Response:** Accumulate → parse JSON:
```json
{
  "epics": [
    {
      "title": "string",
      "description": "string",
      "stories": [
        {
          "title": "string",
          "description": "string",
          "acceptanceCriteria": ["string"]
        }
      ]
    }
  ],
  "generatedAt": "ISO string"
}
```

### `POST /api/save-session`

**Purpose:** Persist session to `analysis_history`. Called server-side with service role key (bypasses RLS — no user auth in v1).

**Phase 1 (on Finalize click):**
```json
{
  "sessionId": "uuid",
  "brdText": "string",
  "initialAnalysis": { ... },
  "messages": [ ... ],
  "status": "finalizing"
}
```
Returns `{ id }` of inserted row.

**Phase 2 (after requirements ready):**
```json
{
  "sessionId": "uuid",
  "requirements": { ... },
  "status": "done"
}
```
PATCH by `sessionId`.

---

## 7. New Types (`types/index.ts`)

```typescript
type Phase = 'input' | 'analyzing' | 'refining' | 'finalizing' | 'done'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Story {
  title: string
  description: string
  acceptanceCriteria: string[]
}

interface Epic {
  title: string
  description: string
  stories: Story[]
}

interface RequirementsResult {
  epics: Epic[]
  generatedAt: string
}
```

---

## 8. Supabase Schema Changes

Add two columns to `analysis_history`:

```sql
ALTER TABLE analysis_history
  ADD COLUMN refinement_messages jsonb,
  ADD COLUMN requirements        jsonb,
  ADD COLUMN status              text DEFAULT 'done';
```

---

## 9. Edge Cases & Error Handling

### API Failures

| Scenario | Handling |
|---|---|
| `/api/refine` fails (network/timeout) | Show inline error in chat: "Gagal mengirim pesan. Coba lagi." — message NOT added to history, input re-enabled |
| `/api/requirements` fails | Show error banner above RequirementsPanel. Phase stays `finalizing`. "Coba lagi" button retries. Conversation already saved to Supabase (phase 1 save already done). |
| `/api/save-session` phase 1 fails | Block finalization — show error: "Gagal menyimpan sesi. Coba lagi." Do NOT call `/api/requirements` yet (two-phase integrity). |
| `/api/save-session` phase 2 fails | Log to console, do not block user — requirements are already on screen. Silent retry once. |
| JSON parse failure on `/api/refine` | Treat as API failure — show retry error. |
| JSON parse failure on `/api/requirements` | Show error: "Gagal membuat requirements. Coba lagi." |

### Conversation Edge Cases

| Scenario | Handling |
|---|---|
| User submits empty message | Disable Send button when input is empty or whitespace-only |
| User submits very long message (>5000 chars) | Client-side: show character count, warn at 4000, block at 5000 |
| User hits Finalize before Claude signals readiness | Button always visible but disabled with tooltip. No override in v1 — Claude must signal first. |
| Claude never signals `readyToFinalize` | System prompt enforces max 5 rounds. On round 5, Claude is instructed to set `readyToFinalize: true` regardless. |
| User refreshes page mid-session | Session lost (client state only). Show browser `beforeunload` warning: "Kamu sedang dalam sesi refinement. Data akan hilang jika kamu meninggalkan halaman." |
| Duplicate Finalize click (double-click) | Disable Finalize button immediately on first click. |
| BRD text was empty when analyzed | This is blocked by existing `BRDInput` validation — not a new case. |

### Export Edge Cases

| Scenario | Handling |
|---|---|
| Clipboard API unavailable (non-HTTPS or old browser) | Show fallback: select-all textarea with the markdown content |
| Download blocked by browser | No special handling — browser handles the block dialog natively |
| Zero epics returned by Claude | Show empty state: "Tidak ada requirement yang dihasilkan. Coba ulangi refinement." with a "Back" button that resets to `refining` phase. |

### Supabase Edge Cases

| Scenario | Handling |
|---|---|
| `analysis_history` row already exists for sessionId | Upsert by `session_id` — not a hard insert — prevents duplicate rows on retry |
| Service role key missing in env | `/api/save-session` returns 500. Show save error to user. Does not block requirements display. |

---

## 10. Future / Out of Scope (v1)

- Jira MCP integration (update work item by ID) — Phase 2
- User-defined output templates — Pro feature, hook already in `/api/requirements` via `outputTemplate`
- Session resume after page refresh — requires auth + history fetch
- FSD format output — Phase 2
- Auth-linked history (`user_id` on `analysis_history`) — after Supabase auth migration

---

## 11. File Checklist

**New files:**
- `app/api/refine/route.ts`
- `app/api/requirements/route.ts`
- `app/api/save-session/route.ts`
- `components/analyze/RefinementChat.tsx`
- `components/analyze/RequirementsPanel.tsx`
- `components/analyze/RequirementsExport.tsx`

**Modified files:**
- `app/(app)/analyze/page.tsx` — phase state machine, layout switching
- `types/index.ts` — new types
- Supabase migration — two new columns on `analysis_history`

---

*Auto-generated by Claude Code — StoryForge brainstorming session 2026-04-14*
