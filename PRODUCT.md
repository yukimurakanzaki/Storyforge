# StoryForge — Product Context

## What It Is

StoryForge.id is a B2B SaaS for Indonesian Product Managers. It analyzes Business Requirement Documents (BRDs), finds gaps and blindspots, and generates structured outputs to prepare teams for sprint grooming.

**Tagline:** "From messy BRD to sprint-ready — in minutes"

## Target Users

**Primary:** Product Managers in Indonesia
- Pain: BRDs from stakeholders are ambiguous, incomplete, causing sprint delays
- Job-to-be-done: Validate BRD quality before committing to a sprint

**Secondary:** Vibe coders / non-technical founders
- Pain: Don't know if idea is complete before building
- Job-to-be-done: Turn rough idea into a buildable PRD

## Core User Flow

1. User pastes a BRD (free text, Bahasa Indonesia or English)
2. AI analyzes for gaps across 5 dimensions
3. User receives structured output in ~30 seconds
4. User copies output to share with stakeholders

## Output Format

1. **Gap List** — Business Context, Functional Requirements, Non-Functional Requirements, User & Role Definition, Edge Cases
2. **Clarification Questions** — Bahasa Indonesia, copy-paste ready for stakeholder meetings
3. **Readiness Score** — 0–100
   - 80–100: Siap (ready to build)
   - 50–79: Perlu Klarifikasi (needs clarification)
   - 0–49: Tidak Siap (not ready)
4. **PRD Draft** — structured, ready to paste into Claude/Cursor

## Pricing Tiers

| Feature | Free | Pro (Rp 199k/mo) |
|---------|------|-----------------|
| Analyses/month | 3 | 50 |
| BRD length | 5k words | 10k words |
| Output watermark | Yes | No |
| Company Context | No | Yes |
| History | 5 max | Unlimited (90 days) |
| Saved Clarifications | No | Yes |
| Score Trend Chart | No | Yes |

## Tech Stack

- **Frontend:** Next.js 14 App Router + Tailwind CSS
- **Hosting:** Vercel
- **Auth + DB:** Supabase (PostgreSQL + Row Level Security)
- **AI:** Anthropic API (claude-haiku-4-5) — server-side only via /api/analyze
- **Queue:** Upstash QStash
- **Email:** Resend
- **Payment (beta):** Manual bank transfer

## Design Principles

- **Language:** UI in Bahasa Indonesia, code in English
- **Tone:** Professional but approachable — Indonesian PM context
- **Speed:** Output in <30 seconds, streaming via SSE
- **Trust:** No raw API key exposure, all AI calls server-side
- **Mobile:** Responsive — PMs use phones in meetings

## Brand Feel

Clean, trustworthy, efficient. Think Notion meets Linear — structured and calm, not flashy. Indonesian market context means familiarity matters: clear labels, minimal jargon, Bahasa Indonesia UI copy.

## Key Pages

- `/` — Landing page (hero, features, pricing, CTA)
- `/analyze` — Main app: input BRD → streaming output
- `/analyze/[id]` — Saved analysis result view
- `/login` + `/signup` — Auth pages
- `/dashboard` — Analysis history + score trends (Pro)

## North Star Metric

**Weekly Active Analyzers (WAA)** — unique users running ≥1 analysis per rolling 7 days

| Milestone | Target |
|-----------|--------|
| Beta (week 8) | 4 |
| 30 days | 15 |
| 60 days | 35 |
| Ongoing | 50+ |
