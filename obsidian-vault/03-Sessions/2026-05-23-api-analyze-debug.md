# Session: /api/analyze Debug + UI Fix — 2026-05-23

## What Was Done

Two bugs fixed: API returning empty error, and result UI broken (invisible text).

---

## Bug 1: /api/analyze empty error

### Root Cause
`lib/anthropic.ts` sent `anthropic-beta: zdr-2025-01-01` unconditionally.
ZDR (Zero Data Retention) requires account-level enrollment at Anthropic.
Without it, the API rejects every call with 400/403. The error was caught by
the background IIFE but `console.error` didn't show full SDK error details
because `APIError` objects have non-enumerable fields.

### Fix
- `lib/anthropic.ts` — ZDR header now gated behind `ANTHROPIC_ZDR_ENABLED=true` env var (off by default)
- `app/api/analyze/route.ts` — Added step-by-step logs:
  - Step 1: API key presence check (logs length, hard-fails if missing)
  - Step 2: Log before Anthropic stream starts
  - Step 3: Log delta count + accumulated length
  - Catch block: full error serialization (name, message, status, error, stack)

### ANTHROPIC_API_KEY Status
Key IS present in `.env.local` (correct format). Not the issue.

---

## Bug 2: UI broken — section titles invisible after analysis

### Root Cause
`SectionCard` and `FoundationSection` components are built for a **dark theme**:
- `text-foreground` = `--foreground: #f1f5f9` (near-white)
- `bg-card/50` = silently fails (hex CSS vars don't support Tailwind opacity modifiers → no background applied)

These components were wrapped in `bg-gray-50` (light).
Result: near-white text on white background = invisible section titles.

### Fix
Changed the `LivingDocument` wrapper in `app/(app)/analyze/page.tsx:782`:
```
Before: bg-gray-50 border-gray-100
After:  bg-slate-900 border-slate-700
```
Dark background now matches the dark-themed components. All section titles
(Foundation, Designer Section, QA Section, etc.) are fully readable.

### Verified
- Ran analysis end-to-end in browser
- Section cards show correctly with dark bg
- Score, gap list, RINGKASAN BRD all readable
- Status badges ("Selesai", "Belum dibuat") visible
- Bottom sticky score pill "25 /100 · Tidak Siap" visible

---

## Other Observations
- Guest usage limit works correctly (3/3 blocks further analysis)
- Session restores from localStorage on reload
- `overflow-hidden` on outer container clips content correctly (no actual overflow)
- ZDR can be re-enabled when Anthropic account enrollment is confirmed:
  set `ANTHROPIC_ZDR_ENABLED=true` in `.env.local` and Vercel env vars
