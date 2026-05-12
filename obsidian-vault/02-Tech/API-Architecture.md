# API Architecture

**Last updated:** 2026-04-09
**Owner:** Adi
**Related:** [[01-Product/PRD-v1.5|PRD v1.5]], [[01-Product/Compliance|Compliance Package]]

---

## Overview

StoryForge uses three server-side API routes to interact with the Anthropic API (Claude Haiku 4.5). All routes run as Vercel Edge Functions and share a single pre-configured Anthropic client.

| Route | Purpose | Output |
|---|---|---|
| `/api/analyze` | BRD gap analysis | `gapList`, `clarificationQuestions`, `readinessScore`, `readinessLabel` |
| `/api/refine` | Conversational refinement | `message`, `readyToFinalize`, `analysis` |
| `/api/requirements` | User story generation | Structured `userStories` JSON |

All three routes enforce authentication (Supabase session or guest-mode header) and rate limiting before calling Anthropic.

---

## Shared Anthropic Client (`lib/anthropic.ts`)

### Why It Exists

Every Anthropic API call **must** include the ZDR header (`anthropic-beta: zdr-2025-01-01`). Rather than trusting each route to configure this independently, we centralize client creation into a single module:

```typescript
// lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: {
    'anthropic-beta': 'zdr-2025-01-01',
  },
})

export { Anthropic }
```

### Benefits

- **Single source of truth** — ZDR header configured once, applied everywhere
- **Impossible to forget** — new routes import the client, header comes for free
- **Auditable** — one file to verify compliance, not three (or more)
- **Type re-export** — routes can import `Anthropic` type for `TextBlock` type guards

---

## ZDR (Zero Data Retention) Header

### What It Does

The `anthropic-beta: zdr-2025-01-01` header tells Anthropic's API to **not retain** any input or output data from the request. Without it, Anthropic may store user data per their standard retention policy.

### Why It's Critical

StoryForge processes sensitive business documents (BRDs, user stories, company context). Under [[01-Product/Compliance|UU PDP]] (Indonesia's data protection law), we claim zero third-party data retention. The ZDR header is what makes that claim truthful.

**Without ZDR:**
- Anthropic may retain BRD text, conversation history, and generated user stories
- Our privacy policy and [[01-Product/PRD-v1.5|PRD v1.5]] compliance claims become false
- William's onboarding and soft launch are blocked

**With ZDR:**
- Anthropic processes data in-memory only, no retention
- UU PDP compliance claim is enforceable
- User trust is maintained

### PRD v1.5 Reference

From the PRD Tech Stack section:
> **AI:** Anthropic API (claude-haiku-4-5, ZDR header)

This architecture ensures that claim is backed by actual code enforcement.

---

## The Rule: Never Instantiate Anthropic Directly in Route Files

> ⚠️ **NEVER** use `new Anthropic(...)` in any file under `app/api/`.
> Always import from `@/lib/anthropic`.

### Why

If a route creates its own `Anthropic` instance, it will **not** have the ZDR header unless the developer manually adds it. This is the exact bug that existed before — three routes, zero ZDR headers, false compliance claims.

### Correct Pattern

```typescript
// ✅ CORRECT — in any API route
import { anthropic, Anthropic } from '@/lib/anthropic'

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [...],
})

// Type guard usage
const textContent = response.content.find(
  (block): block is Anthropic.TextBlock => block.type === 'text'
)
```

### Incorrect Pattern

```typescript
// ❌ WRONG — will be caught by static analysis
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// Missing ZDR header!
```

---

## Adding a New Route That Needs Anthropic

1. Create your route file under `app/api/your-route/route.ts`
2. Import the shared client:
   ```typescript
   import { anthropic, Anthropic } from '@/lib/anthropic'
   ```
3. Use `anthropic.messages.create(...)` for API calls
4. Use `Anthropic.TextBlock` for type guards if needed
5. **Do not** import `@anthropic-ai/sdk` directly
6. Run the static analysis guard to verify: `bash scripts/check-no-direct-anthropic.sh`

---

## Static Analysis Guard

A CI-friendly script prevents regressions:

```bash
# Run manually or in CI
bash scripts/check-no-direct-anthropic.sh
# or directly:
node scripts/check-no-direct-anthropic.js
```

### What It Does

- Scans all `.ts` files under `app/api/` (excluding `__tests__/`)
- Looks for the pattern `new Anthropic(`
- If found: exits with error code 1 and prints the violation location
- If clean: exits with code 0

### When to Run

- Before every PR merge (add to CI pipeline)
- After adding new API routes
- During compliance audits

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Client (Browser)               │
└──────────────┬──────────────┬───────────────┬────┘
               │              │               │
        POST /api/analyze  POST /api/refine  POST /api/requirements
               │              │               │
               ▼              ▼               ▼
┌──────────────────────────────────────────────────┐
│           Vercel Edge Functions                   │
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐    │
│  │ analyze │  │ refine  │  │ requirements │    │
│  └────┬────┘  └────┬────┘  └──────┬───────┘    │
│       │             │              │             │
│       └─────────────┼──────────────┘             │
│                     ▼                            │
│         ┌───────────────────────┐                │
│         │   lib/anthropic.ts    │                │
│         │                       │                │
│         │  defaultHeaders:      │                │
│         │   anthropic-beta:     │                │
│         │   zdr-2025-01-01      │                │
│         └───────────┬───────────┘                │
└─────────────────────┼────────────────────────────┘
                      │
                      ▼
          ┌───────────────────────┐
          │    Anthropic API      │
          │  (Zero Data Retention)│
          └───────────────────────┘
```

---

## Related Documents

- [[01-Product/PRD-v1.5|PRD v1.5]] — Product spec, compliance claims, tech stack
- [[01-Product/Compliance|Compliance Package]] — Privacy policy, ToS, UU PDP
- [[00-Index|Index]] — Navigation hub
