# \# CLAUDE.md — StoryForge Build Context

# 

# \*\*READ THIS FIRST EVERY SESSION\*\*

# 

# \## Project Status (Auto-Updated)

# \- ✅ API live + tested

# \- ✅ Domain storyforge.id available

# \- ⏳ Domain registration — TODAY

# \- ⏳ Email setup — TOMORROW

# \- ⏳ Compliance pages — TOMORROW

# 

# \## Obsidian Vault Context

# 

# Read these before starting work:

# 1\. `obsidian-vault/00-Index.md` — Current status

# 2\. `obsidian-vault/01-Product/PRD-v1.5.md` — Product spec

# 3\. `obsidian-vault/02-Tech/API-Architecture.md` — Tech decisions

# 4\. Most recent session log in `obsidian-vault/03-Sessions/`

# 

# \## Your Job

# 

# At end of EVERY Claude Code session:

# 1\. Write session log to `obsidian-vault/03-Sessions/\[DATE]-\[TOPIC].md`

# 2\. Update `00-Index.md` with latest status

# 3\. Commit to git (manual, end of week)

# 

# \---

# 

# \[rest of CLAUDE.md...]

# StoryForge.id — Claude Code Context

## Product Vision

"From idea to buildable PRD — in minutes"
AI-powered tool that challenges business ideas, finds gaps and blindspots,
and generates ready-to-build PRDs for vibe coders and PMs.

## Two User Segments (One Product)

### Segment A — Vibe Coders / Non-Technical Founders

* Input: rough business idea or concept
* Pain: dont know if idea is viable or complete before building
* Output: PRD ready to paste into Claude/Cursor for vibe coding

### Segment B — Product Managers Indonesia

* Input: BRD from stakeholder
* Pain: BRD is ambiguous, incomplete, causes sprint delays
* Output: gap list + clarification questions + readiness score

## Core Engine (Same for Both Segments)

* Gap analysis \& blindspot detection
* Clarification questions generation
* Readiness Score 0-100
* PRD generation (Bahasa Indonesia + English)

## Stack

* Frontend: Next.js 14 App Router + Tailwind + Vercel
* Auth + DB: Supabase
* AI: Anthropic API (claude-haiku-4-5) — server-side only
* Queue: Upstash QStash
* Payment: Manual bank transfer (beta), Xendit post-beta
* Email: Resend

## Critical Rules

* NEVER expose ANTHROPIC\_API\_KEY to client side
* NEVER ask user to input their own API key
* ALL Anthropic calls go through /api/analyze server route only
* Use streaming via Server-Sent Events
* Max 200k tokens per analysis

## Environment Variables

* ANTHROPIC\_API\_KEY
* NEXT\_PUBLIC\_SUPABASE\_URL
* NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY
* SUPABASE\_SERVICE\_ROLE\_KEY
* UPSTASH\_QSTASH\_TOKEN

## Supabase Tables

* analysis\_events — logs every analysis event
* usage\_counters — rolling 30-day limit per user
* analysis\_history — persistent history per user
* company\_context — Pro user company/project profile
* saved\_clarifications — Pro user saved questions

## Analysis Output Format

1. Gap List — Business Context, Functional Requirements,
Non-Functional Requirements, User \& Role Definition, Edge Cases
2. Clarification Questions — Bahasa Indonesia, copy-paste ready
3. Readiness Score — 0-100

   * 80-100: Siap (ready to build)
   * 50-79: Perlu Klarifikasi
   * 0-49: Tidak Siap
4. PRD Draft — structured, ready to paste to Claude/Cursor

## Pricing

* Free: 3 analyses/month, max 5 history, watermark
* Pro: Rp 199k/month, 50 analyses, Company Context,
unlimited history 90 days, PRD export

## Current Priority Fix

1. Remove API key input field from UI completely
2. Fix /api/analyze — currently Gemini, must use Anthropic claude-haiku-4-5
3. API key from process.env.ANTHROPIC\_API\_KEY only

## North Star Metric

Weekly Active Analyzers (WAA) — unique users ≥1 analysis per rolling 7 days

## Language

* UI: Bahasa Indonesia
* Code: English
* Comments: English

\## 📓 Obsidian Vault Integration



\*\*Vault Path:\*\* `C:\\Users\\USER\\Storyforge\\obsidian-vault\\`



\### How to Use in Claude Code Sessions



1\. \*\*Start:\*\* Read notes from `01-Product/` and `02-Tech/` folders as context

2\. \*\*During work:\*\* Reference existing decisions via `\[\[links]]`

3\. \*\*End session:\*\* Auto-write session log to `03-Sessions/\[DATE]-\[TOPIC].md`



\### Current Notes

\- `00-Index.md` — Navigation hub

\- `01-Product/PRD-v1.5.md` — Complete product spec

\- `01-Product/North-Star-Metric.md` — WAA definition \& tracking

\- `02-Tech/\*` — \[to be created next]



\### Auto-Sync Rules

\- Claude Code writes `.md` files → Obsidian auto-detects

\- No manual action needed

\- Git commit manually (end of week or milestone)

