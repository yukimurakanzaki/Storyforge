# StoryForge — Living Document Design
**Date:** 2026-05-08  
**Status:** Approved for implementation  
**Replaces:** Phase machine (analyze → refine → finalize → requirements)

---

## 1. Vision

StoryForge becomes a **living document workspace** — one BRD session generates a complete, structured requirement document that every stakeholder (PM, Engineer, Designer, QA, Business) can read and act on independently.

The workflow mirrors how a PM actually works in Claude chat today, but with persistence, structured artifacts, and one-click export.

---

## 2. Core Concepts

### 2.1 Project
A Project is a named container that groups related sessions and holds a `design.md` — the design system contract used when generating prototype prompts.

**Fields:**
- `id` — uuid
- `user_id` — owner
- `name` — project name (e.g. "Invoice Module", "Onboarding Flow")
- `design_md` — text, nullable. The project's design system spec.
- `design_md_source` — enum: `uploaded` | `generated` | null
- `created_at`

**design.md behaviour:**
- Existing project → PM pastes or uploads their existing `design.md`
- New project → AI generates a starter `design.md` from the BRD + Q&A answers at session finalization time. PM can edit before saving.
- Used exclusively by the Prototype Prompt generator (section 9 of the living document)

### 2.2 Session (Living Document)
Each session represents one feature/BRD being refined. It is a **living document** with 9 independent sections that fill in progressively.

A session belongs to a Project. A Project has many Sessions.

**Session state:** `refining` → `ready` → `done`
- `refining` — still iterating clarification rounds
- `ready` — readiness score ≥ 80, artifacts can be generated
- `done` — all desired sections generated, exported

**Section state (per section):** `empty` → `generating` → `done` → `stale`
- `stale` — requirement was updated after this section was generated; shows Regenerate button
- Sections are independent — updating one does not auto-update others

---

## 3. The 11-Step Workflow → UI Mapping

| Step | What you do | UI state |
|------|-------------|----------|
| 1 | Paste BRD | BRD input area (top of session) |
| 2 | AI: gap analysis + questions | Foundation section fills in; Q&A panel opens |
| 3 | Answer questions (partial ok) | Q&A cards with textarea + "out of scope" toggle |
| 4–5 | Iterate clarification rounds | Re-analyze button; readiness score updates live |
| 6 | Come back days later | Session list shows readiness score + open gaps on re-open |
| 7 | Generate artifacts | Each section has a Generate button; sections fill independently |
| 8 | Paste stakeholder/eng feedback | Feedback input at top of session; AI gives live gap delta |
| 8.5 | Update artifacts after feedback | Stale sections show Regenerate; PM picks which to update |
| 9 | Export to Jira | Copy markdown or push via Jira MCP per section or full doc |
| 10 | Designer handoff + QA scenarios | Sections 5 (Designer) and 6 (QA) export buttons |
| 11 | Prototype prompt | Section 9 (Export) generates prompt using project's design.md |

**Re-open behaviour (step 6):** When PM returns to an existing session, the page opens directly to the **Foundation section** showing current readiness score + remaining gap list — not the BRD input. This is the "where am I" view.

---

## 4. Living Document — 9 Sections

Each section renders as a collapsible card with:
- Section title + stakeholder badge(s)
- Status indicator (empty / generating / done / stale)
- Generate / Regenerate button
- Copy button (copies section as Markdown)
- Content area

### Section 1 — Foundation
**Consumers:** PM, All  
**Generated from:** Initial BRD + all Q&A rounds  
**Contents:**
- BRD summary (condensed, 200 words max)
- Gap list (grouped: Business Context, Functional, Non-functional, Roles, Edge Cases)
- Readiness score 0–100 with label (Siap / Perlu Klarifikasi / Tidak Siap)
- Clarification Q&A log (all rounds, collapsible)
- Assumption register (things AI assumed, PM must confirm)
- Out-of-scope items list

**Always visible on session re-open.** Cannot be stale — re-generates on every refinement round automatically.

### Section 2 — Roles & Access
**Consumers:** PM, Dev, Designer  
**Generated from:** Refined requirement  
**Contents:**
- User access matrix (role × feature × permission level)
- Role definitions (name, description, key responsibilities)
- User personas summary (one paragraph per persona)

### Section 3 — Flow & Logic
**Consumers:** Dev, Designer, QA  
**Generated from:** Refined requirement  
**Contents:**
- UX flow — numbered step-by-step user journey (happy path)
- Swimlane flowchart — rendered as **Mermaid.js** diagram with role swimlanes (happy path + edge cases + error states + decision points)
- Edge cases list (derived from flowchart branch points)
- Decision point registry (condition → outcome table)

**Flowchart spec:**
- Rendered as Mermaid `flowchart TD` with `subgraph` per role lane
- Static SVG output — screenshottable, copy-able
- Exportable as Mermaid source (paste into any Mermaid renderer)
- Phase 1: static only. No inline editing.

### Section 4 — Engineer Section
**Consumers:** Dev  
**Generated from:** Refined requirement + Section 2 (roles) + Section 3 (flow)  
**Contents:**
- User stories in INVEST format (one card per story)
- Acceptance criteria in Gherkin style (Given / When / Then) per story
- Data model hints (entity names, key fields, field types — not a full schema)
- API contract hints (endpoint names, HTTP method, key request/response fields)
- Non-functional requirements (performance, security, scalability notes from BRD)
- Technical constraints & dependencies (third-party systems, existing APIs)
- Definition of Done checklist

### Section 5 — Designer Section
**Consumers:** Designer  
**Generated from:** Refined requirement + Section 2 (roles) + Section 3 (flow) + Section 7 (templates if present)  
**Contents:**
- Component list with states: default, hover, active, error, empty, disabled
- Field context table: field name | label | type | placeholder | validation rule | error message | notes
- Interaction & transition notes (what happens on each user action)
- Responsive breakpoint notes (mobile / tablet / desktop behaviour differences)
- Figma-ready spec section (structured for a designer working in Figma — component names match Figma component naming conventions)

### Section 6 — QA Section
**Consumers:** QA  
**Generated from:** Section 3 (flow) + Section 4 (Gherkin AC) + Section 7 (templates if present)  
**Contents:**
- Base test scenarios (one per Gherkin scenario, formatted as test case)
- Edge case test scenarios (derived from flowchart branch points and error states)
- Test data requirements (what data needs to exist for each scenario)
- Regression risk areas (parts of existing system that could be affected)

### Section 7 — Template Artifacts
**Consumers:** Dev, Designer, QA  
**How it's populated:** PM uploads or pastes stakeholder-provided templates  
**Supported template types:**
- Email templates (HTML or plain text) — stakeholder-drafted notification/confirmation emails
- Upload templates (Excel, CSV) — files users upload into the system
- Download templates (Excel, PDF) — files the system generates for users

**AI analysis per template:**
- Extracts all dynamic fields/placeholders (e.g. `{{invoice_number}}`, `{{due_date}}`)
- Documents field source (where does this data come from?)
- Links extracted fields to Section 5 field context table and Section 4 data model hints
- Generates validation rules per field
- Flags missing fields (template references data not in the requirement)

**This section has an "Add Template" button, not a Generate button** — it is populated by PM upload/paste only. The AI analysis runs automatically on each addition. Multiple templates can be added to one session.

### Section 8 — Stakeholder View
**Consumers:** Business stakeholders (non-technical)  
**Generated from:** Refined requirement + readiness score  
**Contents:**
- Executive summary in plain Bahasa Indonesia (non-technical, 3–5 bullet points)
- Readiness status (traffic light: Siap / Perlu Klarifikasi / Tidak Siap)
- Scope boundary: what is in scope vs explicitly out of scope
- Estimated user impact (how many users affected, which roles)

### Section 9 — Output & Export
**Consumers:** All  
**This section is a control panel, not a generated artifact.**  
**Export actions:**
- **Full doc** — export entire living document as Markdown
- **Jira export** — copy as Jira wiki markup (Phase 1) / push via Jira MCP creating epics + stories (Phase 2)
- **FSD doc** — export Functional Specification Document as Markdown (Section 1 + 4 + 5 + 6)
- **Designer handoff** — export Section 5 as Markdown
- **QA scenarios** — export Section 6 as Markdown
- **Prototype prompt** — generate a prompt for Claude Code / Cursor / other agentic tool

**Prototype prompt generation:**
- Uses: refined requirement + Section 3 (UX flow) + Section 4 (user stories) + Section 5 (components + fields) + project's `design.md`
- Output: a single prompt the PM can paste into Claude Code to build a clickable HTML/CSS prototype
- If project has no `design.md`: offer to generate one first, or generate a generic prompt

---

## 5. Feedback Loop (Step 8 + 8.5)

A **Feedback input** lives at the top of the session (below the BRD, above the sections).

**How it works:**
1. PM pastes free-form text or a block from stakeholder/engineering (both handled)
2. AI runs a live gap delta: compares feedback against current refined requirement
3. AI returns: new gaps identified, changed assumptions, confirmed items, recommended requirement updates
4. PM reviews and confirms updates to apply
5. Confirmed updates modify the refined requirement state
6. All sections that depend on changed parts are marked **stale**
7. PM selectively regenerates stale sections with one click each

---

## 6. Data Model Changes

### New table: `projects`
```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  design_md text,
  design_md_source text check (design_md_source in ('uploaded', 'generated')),
  created_at timestamptz default now()
);
```

### Updated table: `analysis_results`
Add columns:
- `project_id uuid references projects` — nullable (sessions not in a project still work)
- `sections jsonb` — stores all 9 section blobs: `{ foundation: {...}, roles: {...}, flow: {...}, engineer: {...}, designer: {...}, qa: {...}, templates: {...}, stakeholder: {...} }`
- `section_states jsonb` — per-section state: `{ foundation: 'done', engineer: 'stale', ... }`
- `requirement_version integer default 1` — increments on each confirmed requirement update
- `session_state text` — `refining | ready | done`

---

## 7. API Routes

### New routes:
- `POST /api/projects` — create project
- `GET /api/projects` — list user's projects
- `PATCH /api/projects/[id]/design-md` — update design.md
- `POST /api/generate-section` — generate a specific section: `{ sessionId, section: 'engineer' | 'designer' | ... }`
- `POST /api/feedback` — process feedback, return gap delta and recommended updates
- `POST /api/apply-feedback` — apply confirmed updates to requirement, mark stale sections
- `POST /api/templates/analyze` — analyze an uploaded/pasted template, extract fields
- `POST /api/export/prototype-prompt` — generate prototype prompt using design.md

### Updated routes:
- `POST /api/analyze` — unchanged (initial gap analysis)
- `POST /api/refine` — unchanged (Q&A refinement rounds)
- `POST /api/save-session` — add `project_id`, `sections`, `section_states`, `session_state`

---

## 8. Flowchart Technical Spec

**Library:** Mermaid.js (already available via CDN, no install needed)  
**Syntax:** `flowchart TD` with `subgraph` per role swimlane  

**AI output format:** AI returns Mermaid source as a string. Client renders it.

**Example structure:**
```
flowchart TD
  subgraph Admin
    A1[Approve request] --> A2{Valid?}
  end
  subgraph User
    U1[Submit request] --> A1
    A2 -->|No| U2[See rejection reason]
    A2 -->|Yes| U3[Receive confirmation]
  end
```

**Export options:** Screenshot (browser), Copy Mermaid source  
**Phase 1:** Static render only. No drag-and-drop editing.

---

## 9. Rollout Phases

### Phase 1 — For yourself (current sprint)
- Project layer (create, attach design.md)
- Session-as-document with all 9 sections
- Flowchart (static Mermaid render)
- Template artifacts (paste/upload + AI analysis)
- Feedback loop + stale section detection
- Export: copy as Markdown per section
- Prototype prompt with design.md
- Jira: copy as Jira wiki markup (no MCP yet)

### Phase 2 — Your team
- Team/workspace concept (invite teammates)
- Jira MCP push (create epics + stories directly)
- Section-level commenting (teammate can annotate)
- Session sharing via link

### Phase 3 — Public SaaS
- Public signup
- Tiered plans (Free / Pro / Team)
- Bahasa Indonesia UI (already started)
- Usage limits + billing (Xendit)

---

## 10. Out of Scope (Phase 1)

- Flowchart inline editing (drag-and-drop nodes)
- Dark mode
- Real-time collaboration
- Jira MCP push
- Automated design.md generation from scratch (AI-assisted generation on finalization is in scope; standalone design.md generator is not)
- Mobile-optimized layout (desktop-first for Phase 1)
