# StoryForge.id — Analyze Page & User Journey Redesign

**Date:** 2026-04-25  
**Status:** Approved for implementation planning  
**Scope:** Landing page fix, auth gate removal, persistent analyze workspace, user story generation

---

## 1. Problem Statement

Current MVP has two blocking UX issues:
1. Landing page footer links ("Kebijakan Privasi", "Syarat Layanan") overlap the main CTA button on shorter viewports
2. User journey requires auth before they can try the product — friction kills conversion before users see value

Underlying design issue: the analyze page was built as a linear form (input → submit → done), not a workspace. PMs iterate, they don't fill forms.

---

## 2. Design Goals

- Show value before asking for commitment (anonymous-first)
- Model the workspace after how PMs already use Claude for gap analysis
- Never force a session close — user is the source of truth on when they're done
- Generate structured output (INVEST user stories + Gherkin + field context) without leaving the workspace

---

## 3. User Tiers

| Capability | Anonymous | Free | Pro |
|---|---|---|---|
| Access to analyze | Temp session (24h) | Unlimited sessions | Unlimited sessions |
| Refinement rounds | Max 3 | Unlimited | Unlimited |
| Generations | 1 per temp session | Up to 5 user stories per generation | Unlimited user stories |
| Projects | No | No | Yes |
| Custom instructions | No | No | Yes (per project) |
| PRD generation | No | No | Yes |
| BRD length limit | 5,000 words | 10,000 words | 20,000 words |
| Export | No | Copy as Markdown | Copy as Markdown + download |
| Chat history | No (localStorage only) | Yes (permanent) | Yes (permanent) |

---

## 4. Landing Page Fix

**Problem:** Footer uses `position: absolute; bottom: 6` — overlaps CTA on short viewports.

**Fix:** Remove absolute positioning from footer. Change page layout to `flex-col min-h-screen` with the footer pushed naturally to the bottom using `mt-auto`. Both CTA buttons link directly to `/analyze` (no auth gate).

**Before:**
```
<main> (flex, justify-center)
  <div> content </div>
  <footer> (absolute bottom-6) </footer>
</main>
```

**After:**
```
<main> (flex flex-col min-h-screen)
  <div class="flex-1 flex items-center justify-center"> content </div>
  <footer class="py-6"> links </footer>
</main>
```

---

## 5. Authentication Flow

**Anonymous path:**
- `/analyze` opens a temp session — no login required
- Session state stored in `localStorage` as `sf_temp_session`
- Includes: requirement text, messages, analysis, answers, generated artifact
- After 3 refinement rounds OR after generation: show account prompt banner

**Account prompt (not a blocking modal):**
> *"Simpan hasil analisis ini — buat akun gratis untuk menyimpan sesi dan mulai analisis baru kapan saja."*
> `[Daftar Gratis]` `[Lanjutkan tanpa akun]`

**Session migration on signup:**
- On successful account creation, POST `sf_temp_session` to `/api/migrate-session`
- Server saves it as a permanent `AnalyzeSession` linked to the new user
- Redirect to `/app/analyze/[newSessionId]` — user sees their work intact
- Clear `localStorage` after successful migration

**Logged-in path:**
- `/app/analyze` → creates new session → redirects to `/app/analyze/[sessionId]`
- Sidebar shows all past sessions and projects (Pro)

---

## 6. Core Data Model

```
User
├── id, email, tier (anonymous | free | pro | team)
└── Projects[] (Pro only)
    └── Project
        ├── id, name, createdAt
        ├── customInstructions: ProjectInstructions
        │     ├── domain: string (e.g. "Fintech", "E-commerce")
        │     ├── techStack: string (e.g. "Laravel, React, Flutter")
        │     ├── targetUsers: string
        │     └── teamConventions: string (optional freetext)
        └── AnalyzeSessions[]

AnalyzeSession
├── id, userId, projectId (nullable), status ('active' | 'archived')
├── createdAt, updatedAt
├── requirementContext: string (BRD paste content, if any)
├── messages: Message[]
│     └── Message: { role: 'user' | 'assistant', content, createdAt }
├── currentAnalysis: Analysis (nullable)
│     ├── readinessScore: number (0-100)
│     ├── readinessLabel: string
│     ├── gaps: Gap[]
│     │     └── Gap: { id, category, description, severity: 'high'|'medium'|'low' }
│     └── questions: ClarificationQuestion[]
│           └── ClarificationQuestion: { id, text, answer: string|null, isOutOfScope: boolean }
└── artifact: GeneratedArtifact (nullable)
      └── GeneratedArtifact
            ├── type: 'userStories' | 'prd'
            ├── generatedAt
            └── userStories: UserStory[]
                  └── UserStory
                        ├── title: string
                        ├── asA: string
                        ├── iWant: string
                        ├── soThat: string
                        ├── investNotes: InvestCriteria
                        │     └── { independent, negotiable, valuable, estimable, small, testable }
                        ├── acceptanceCriteria: GherkinScenario[]
                        │     └── { title, given: string[], when: string[], then: string[] }
                        └── fieldContextTable: FieldRow[] (nullable — only if fields exist)
                              └── { fieldName, description, dataType, example }
```

---

## 7. Page Structure & Navigation

```
/                          → Landing page (anonymous)
/analyze                   → Anonymous temp session workspace
/login                     → Login / signup
/app/analyze               → Creates new session, redirects to /app/analyze/[id]
/app/analyze/[sessionId]   → Analyze workspace (logged in)
/app/projects/[projectId]  → Project detail: sessions list, custom instructions
/app/dashboard             → All sessions history
/app/settings              → Account, billing
```

**Sidebar (logged in):**
```
[+ Analisis Baru]
─────────────────
Projects (Pro)
  └── [nama proyek] →
─────────────────
Riwayat Sesi
  └── "Fitur notifikasi push" (3j lalu) — active
  └── "Login flow BRD" (kemarin) — archived
  └── ...
```

---

## 8. Analyze Workspace — Layout & UX

### 8.1 Layout

Split panel — persistent side by side on desktop, stacked on mobile:

```
┌─────────────────────────┬──────────────────────────┐
│ LEFT: Requirement + Q&A │ RIGHT: Live Analysis      │
│                         │                          │
│ [BRD Paste area]        │  Readiness: 62/100       │
│ (optional, collapsible  │  ████████░░░             │
│  after first submit)    │                          │
│                         │  Gap Aktif:              │
│ ─────────────────────── │  ● [HIGH] Error handling │
│ Chat messages           │    tidak didefinisikan   │
│ (conversation history)  │  ● [MED] Auth flow       │
│                         │    belum jelas           │
│ Q&A Cards:              │                          │
│ ┌─────────────────────┐ │  Pertanyaan Terbuka: 3   │
│ │ Q: Bagaimana jika   │ │                          │
│ │ user lupa password? │ │  [Generate User Stories] │
│ │ [________________] │ │  (amber jika < 80,       │
│ │ [ ] Out of scope    │ │   hijau jika ≥ 80)       │
│ └─────────────────────┘ │                          │
│                         │                          │
│ [Chat input _________]  │                          │
│ [Kirim]  [Analisis Ulang│                          │
└─────────────────────────┴──────────────────────────┘
```

### 8.2 Requirement Entry (Additive Model)

Two entry modes, both active simultaneously — they combine as context:

1. **BRD Paste Area** (top of left panel): A collapsible textarea. Shown expanded on first visit. After first analysis, collapses to a summary bar showing word count. User can re-expand to edit.
2. **Chat Input** (bottom of left panel): Free-form messages. Used to describe requirements, add context, or answer questions conversationally.

Both are sent together on each analysis cycle. The AI treats BRD content + chat messages as unified context.

### 8.3 Q&A Cards

Generated after first analysis. Each card shows:
- Question text
- Inline text input for the answer (or leave blank = "not addressed")
- "Out of scope" checkbox — marks the question as explicitly excluded
- Resolved questions collapse into a "Sudah Dijawab (N)" accordion — not deleted, just hidden

**Submission trigger:** A "Submit Jawaban" button sits at the bottom of the Q&A cards section — separate from the chat "Kirim" button. Submitting Q&A answers and sending a chat message are two distinct actions that both trigger a re-analysis cycle. Users can do either or both in any order.

On each re-analysis cycle (triggered by either "Submit Jawaban" or "Kirim"), the AI produces two outputs simultaneously:

**Right panel (structured):** Readiness score + gap list update silently in place.

**Left panel (conversational):** The AI posts a chat reply explaining:
- What new gaps were found (if any) and why they matter
- Which previously open gaps are now closed
- A concrete suggestion for what to address next

This keeps the left panel as a live conversation, not just a form — the AI is an active participant guiding the PM toward a complete requirement.

### 8.4 Buttons

- **Submit Jawaban** (Q&A section) — submits all currently filled Q&A card answers, triggers re-analysis
- **Kirim** (chat input) — sends a chat message, triggers re-analysis; `Enter` key is equivalent to clicking Kirim, `Shift+Enter` inserts a newline
- **Analisis Ulang** — forces a fresh gap analysis without new input (useful after editing BRD textarea)
- **Generate User Stories** — always visible in right panel; amber + warning tooltip when score < 80, green when ≥ 80; clicking when < 80 shows confirmation: *"Readiness masih rendah. Generate anyway?"*
- **Selesai & Arsipkan** — in the session header; archives the session (read-only), moves it to history

### 8.5 Right Panel States

| State | Content |
|---|---|
| Empty (before first submit) | Tips on how to write a good BRD |
| Analyzing | Skeleton loader |
| Active | Readiness score + gap list + open question count + Generate button |
| Generating | Loading state in right panel, left panel still usable |
| Artifact Ready | User stories rendered as cards, Generate button changes to "Regenerate" |

---

## 9. Session Lifecycle

```
created → active (user working) → archived (user clicks "Selesai & Arsipkan")
                ↑________________________|
           (session stays active,
            user can generate, refine,
            regenerate artifact at any time)
```

- No auto-close on generation
- Multiple generations allowed in one session — artifact is replaced in place
- "Duplikat Sesi" on an archived session: copies requirement text only, opens a new active session with fresh analysis

---

## 10. User Story Output Format

Each user story card shows:

```
[Story title]

As a [role], I want [capability], so that [benefit].

INVEST:
  I — Independent: [note]
  N — Negotiable: [note]
  V — Valuable: [note]
  E — Estimable: [note]
  S — Small: [note]
  T — Testable: [note]

Acceptance Criteria:
  Scenario: [title]
    Given [context]
    When [action]
    Then [outcome]
  
  Scenario: [title]
    ...

[Field Context Table — only shown if fields exist]
| Field Name | Description | Data Type | Example |
|---|---|---|---|
| email | User login identifier | string | user@email.com |
```

---

## 11. Projects & Custom Instructions (Pro)

Project creation form collects structured fields (not freetext — these are injected reliably into the analysis prompt):

- **Nama Proyek** — display name
- **Domain Bisnis** — dropdown: Fintech, E-commerce, Healthcare, Logistik, SaaS B2B, Lainnya
- **Tech Stack** — tags input with suggestions (Laravel, React, Flutter, Next.js, etc.)
- **Target Pengguna** — short text (e.g., "UMKM owner, non-technical")
- **Konvensi Tim** — optional freetext with a template guide shown as placeholder

All sessions created inside a project automatically inherit these instructions. Sessions can be created outside any project (standalone).

---

## 12. BRD Length Limits

| Tier | Soft Warning | Hard Limit |
|---|---|---|
| Anonymous | 3,000 words | 5,000 words |
| Free | 5,000 words | 10,000 words |
| Pro | 10,000 words | 20,000 words |

On soft warning: inline notice below textarea, non-blocking.  
On hard limit: submission blocked with message: *"Dokumen terlalu panjang. Coba potong bagian yang tidak relevan, atau upgrade ke Pro untuk batas lebih tinggi."*

---

## 13. Export (MVP)

- "Copy as Markdown" button on the artifact panel — copies all user stories as formatted markdown to clipboard
- Pro: download as `.md` file
- Future: export to Notion, Jira (post-MVP)

---

## 14. Edge Cases & Resolved Decisions

| Edge Case | Decision |
|---|---|
| Score never reaches 80 | Generate button always visible; amber warning when < 80, user overrides |
| Anonymous session expires (24h) | Show "Sesi kamu sudah kedaluwarsa" page with CTA to sign up |
| Session migration fails on signup | Show error, keep localStorage, let user retry migration from dashboard |
| API failure during generation | Show recoverable error in right panel: "Generasi gagal. Coba lagi →" — session stays active |
| Long question list (10+ questions) | Q&A cards paginated: show 5 at a time, "Tampilkan lebih banyak" |
| User story with no form fields | Field context table hidden — not rendered |
| Multi-tab same session | Last write wins; no conflict resolution for MVP — show "Sesi ini dibuka di tab lain" warning |
| New registered user (empty history) | Empty state: "Mulai analisis pertamamu →" with direct link to new session |
| Anonymous user hits round limit | Non-blocking banner after round 3: account prompt with "Lanjutkan tanpa akun" option |

---

## 15. Out of Scope (This Phase)

- PRD generation (Pro, post-MVP)
- Team collaboration / session sharing
- Jira / Notion export integration
- Stakeholder pattern library
- Template enforcement
- Amplitude / analytics integration
