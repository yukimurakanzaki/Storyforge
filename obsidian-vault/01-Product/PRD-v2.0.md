# PRD v2.0 — StoryForge: The BRD Quality Gate

> ⚠️ **SUPERSEDED (historical).** Pricing and scope here are out of date.
> Current source of truth: [[Roadmap-2026-06-19-Review-Board|Roadmap v1.2]] + [[Build-Spec-v1.0|Build Spec v1.0]] (and [[Requirements-Full-v3.0]]).

**Version:** 2.0
**Date:** 2026-05-13
**Owner:** Adi
**Status:** Draft — Pre-Launch

---

## 📝 Overview

StoryForge.id adalah **quality gate antara BRD dan sprint**. Platform ini menangkap apa yang manusia lewatkan — gap, ambiguitas, dan blindspot dalam dokumen produk — sebelum masuk ke development.

**Positioning:** "No BRD goes to sprint grooming unless it scores ≥ 80."

**Bukan** sekadar AI PRD generator (ChatGPT/Claude bisa itu). StoryForge adalah **proses tool** yang memberikan skor kuantitatif, tracking kualitas over time, dan output terstruktur siap-sprint dalam Bahasa Indonesia.

**Evolusi dari v1.5:**
- v1.5: "BRD Gap Analysis Tool"
- v2.0: "The BRD Quality Gate" — dari tool menjadi proses standar tim

**Input:** BRD, ide bisnis, atau konsep produk (free text, bilingual ID/EN)
**Output:**
1. **Readiness Score (0–100)** — Skor kuantitatif kualitas BRD (unique differentiator)
2. Gap Analysis (terstruktur per kategori + severity + confidence)
3. Clarification Questions (Bahasa Indonesia, siap copy-paste ke stakeholder)
4. Full PRD Document (multi-section, structured, ready-to-build)

---

## 🏆 Competitive Positioning

### Why Not Just Use ChatGPT/Claude?

| Capability | StoryForge | ChatPRD | ChatGPT/Claude |
|---|---|---|---|
| **Readiness Score (0-100)** | ✅ Unique | ❌ | ❌ |
| **Score trend over time** | ✅ Unique | ❌ | ❌ |
| **Structured gap categories** | ✅ 5 categories + severity | Generic | Unstructured |
| **Bahasa Indonesia native** | ✅ First-class | ❌ English only | Okay but not native |
| **Company Context memory** | ✅ Persistent per project | ❌ Per-chat | ❌ Per-session |
| **Sprint-ready output** | ✅ Jira/Linear format | Generic PRD | Generic text |
| **Quality gate workflow** | ✅ "≥80 or don't sprint" | ❌ | ❌ |
| **BRD-in → PRD-out** | ✅ Evaluates existing docs | Generates from scratch | Generates from scratch |

### Moat Strategy

1. **Process integration** — StoryForge becomes the team's quality standard ("score ≥ 80 before grooming")
2. **Bahasa Indonesia** — Native output for Indonesian stakeholder communication
3. **Score history** — Shows improvement over time, creates switching cost
4. **Company Context** — Learns your tech stack, business domain, team conventions

---

## 🎯 North Star Metric

**Weekly Active Analyzers (WAA)**
- Unique users yang run ≥1 analisis per 7 hari

| Timeline | Target | Notes |
|---|---|---|
| Launch (Juni W2) | 5 | William + 4 beta users |
| 30 hari | 20 | Organic + referral |
| 60 hari | 50 | Confident for phase 2 |
| 90 hari | 100+ | Sustainable growth |

**Secondary Metrics:**
- Free → Pro conversion rate (target: 25%)
- Analysis completion rate (target: 80%)
- PRD generation rate (target: 40% of completed analyses)
- Churn rate (target: <10% monthly)

---

## 👥 User Segments

### Segment A — Vibe Coders / Non-Technical Founders
- **Input:** Rough business idea or concept
- **Pain:** Don't know if idea is viable or complete before building
- **Output:** PRD ready to paste into Codex/Cursor for vibe coding
- **Willingness to pay:** Medium (Rp 199k is cheap vs hiring a PM)

### Segment B — Product Managers Indonesia
- **Input:** BRD from stakeholder
- **Pain:** BRD is ambiguous, incomplete, causes sprint delays
- **Output:** Gap list + clarification questions + readiness score + structured PRD
- **Willingness to pay:** High (saves 2-4 hours per sprint)

---

## 💰 Pricing Model (v2.0)

### No More Guest Mode

Guest mode dihapus. Semua user harus signup (Google OAuth atau email). Alasan:
- Signup friction near-zero dengan Google OAuth (2 detik)
- Guest data tidak bisa di-track untuk WAA atau retention
- Mengurangi kompleksitas codebase (localStorage tracking, session migration, guest rate limiting)
- Free tier sudah cukup generous untuk trial

### Tier Structure

| Feature | Free | Pro (Rp 199k/bln) | Team (Rp 149k/seat/bln) |
|---|---|---|---|
| Analisis/bulan | 3x | 50x | 100x per seat |
| BRD length | 5k kata | 10k kata | 15k kata |
| AI Model | Gemini 2.0 Flash | Claude Haiku 4.5 (ZDR) | Claude Sonnet 4.6 (ZDR) |
| Output watermark | ✅ | ❌ | ❌ |
| PRD Generation | Basic (foundation only) | Full (all sections) | Full + priority |
| Company Context | ❌ | ✅ (1 project) | ✅ (unlimited projects) |
| History | 5 max, 30 hari | Unlimited, 90 hari | Unlimited, 1 tahun |
| Saved Clarifications | ❌ | ✅ | ✅ |
| Score Trend Chart | ❌ | ✅ | ✅ |
| Export (Markdown/PDF) | ❌ | ✅ | ✅ |
| **Team workspace** | ❌ | ❌ | ✅ |
| **Shared projects** | ❌ | ❌ | ✅ |
| **Team score dashboard** | ❌ | ❌ | ✅ |
| **Admin seat management** | ❌ | ❌ | ✅ |
| Min seats | — | — | 3 |
| Support | Community | Email | Priority email + onboarding |

**Why Team instead of Max:**
- Per-seat pricing scales with team size (3 seats = Rp 447k, 10 seats = Rp 1.49jt)
- Team features (shared projects, team dashboard) create real switching cost
- Aligns with "quality gate" positioning — the whole team adopts the standard
- Higher LTV: one team admin pays for 5-10 seats vs one individual paying Pro
- ChatPRD charges $25/seat for teams — Rp 149k (~$9/seat) is competitive for Indonesian market

### Payment Flow (Beta — Manual Transfer)

1. User klik "Upgrade ke Pro" → muncul instruksi transfer
2. Transfer ke rekening BCA/Mandiri dengan kode unik
3. User upload bukti transfer via form
4. Admin verifikasi manual (< 24 jam)
5. Subscription aktif 30 hari dari tanggal verifikasi
6. Reminder email H-3 sebelum expired
7. Grace period 3 hari setelah expired

### Payment Flow (Phase 2 — Xendit)

- Auto-billing via Xendit Virtual Account atau QRIS
- Instant activation
- Auto-renewal
- Dunning flow untuk failed payments

---

## 🏗️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 App Router + Tailwind | Deployed on Vercel |
| Auth | Supabase Auth (Google OAuth + email) | @supabase/ssr |
| Database | Supabase PostgreSQL + RLS | Row-level security on all tables |
| AI (Free) | Google Gemini 2.0 Flash | $0.075/$0.30 per MTok — near-zero cost |
| AI (Pro) | Anthropic Claude Haiku 4.5 | $1/$5 per MTok — ZDR header, best structured output |
| AI (Max) | Anthropic Claude Sonnet 4.6 | $3/$15 per MTok — premium quality |
| Streaming | Server-Sent Events (SSE) | Real-time analysis output |
| Queue | Upstash QStash | Rate limiting, async jobs |
| Email | Resend | Transactional + retention |
| Payment (beta) | Manual bank transfer | Admin verification |
| Payment (phase 2) | Xendit | Subscription billing |
| Monitoring | Vercel Analytics | Page views, Web Vitals |

### AI Model Strategy

| Tier | Model | Cost/Analysis | Why |
|---|---|---|---|
| **Free** | Gemini 2.0 Flash | ~Rp 5 | Near-zero cost, good enough for basic gap analysis. No China data concern. SDK already installed. |
| **Pro** | Claude Haiku 4.5 | ~Rp 500 | Best structured output quality-to-cost. ZDR header = zero data retention. 76% margin. |
| **Team** | Claude Sonnet 4.6 | ~Rp 1.200 | Premium quality for complex enterprise BRDs. Best PRD generation. Team features justify premium. |

**Why tiered models:**
- Free tier becomes sustainable (Rp 15/user/month vs Rp 1.500 with Claude)
- Clear quality upgrade incentive — users feel the difference
- Pro/Max get ZDR compliance (Anthropic) — important for enterprise BRDs
- Google Gemini for free tier: US-based, clear data terms, no China concern

**Data Privacy by Tier:**
- Free (Gemini): Google Cloud data processing terms apply
- Pro/Max (Anthropic): Zero Data Retention header — no input/output stored by Anthropic
- All tiers: Supabase RLS, UU PDP compliant

---

## 🔄 Core User Flow (v2.0)

```
Landing Page → Sign Up (Google/Email) → /analyze
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  BRD Input    │
                                    │  (paste/type) │
                                    └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  AI Analysis  │
                                    │  (streaming)  │
                                    └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │  Results:     │
                                    │  • Gap List   │
                                    │  • Questions  │
                                    │  • Score      │
                                    └───────┬───────┘
                                            │
                                    ┌───────┴───────┐
                                    │               │
                                    ▼               ▼
                            ┌──────────┐    ┌──────────────┐
                            │ Refine   │    │ Generate PRD │
                            │ (Q&A)    │    │ (Pro only    │
                            └──────────┘    │  full doc)   │
                                            └──────────────┘
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │  Copy/Export │
                                            │  to Cursor   │
                                            └──────────────┘
```

---

## 📱 UX Requirements (v2.0)

### Design Principles

1. **Speed first** — User harus bisa paste BRD dan dapat hasil dalam < 30 detik
2. **Progressive disclosure** — Tampilkan hasil bertahap (streaming), jangan tunggu semua selesai
3. **Clear tier boundaries** — User selalu tahu fitur mana yang free vs Pro, tanpa blocking wall yang frustrating
4. **Mobile-friendly** — 60% PM Indonesia akses via mobile
5. **Bahasa Indonesia first** — Semua UI copy dalam Bahasa Indonesia

### Page-by-Page UX Spec

#### Landing Page (`/`)
- Hero: "Dari Ide ke PRD Siap-Build — dalam Hitungan Menit"
- CTA: "Mulai Gratis" → signup
- Social proof: testimonial dari beta users
- Feature comparison table (Free vs Pro vs Max)
- FAQ section

#### Analyze Page (`/analyze`)
- **Free user:** Langsung ke BRD input (skip project selection)
- **Pro user:** Project selector → BRD input (with Company Context)
- **Max user:** Same as Pro with priority badge
- Sidebar: session history (clickable to resume)
- Header: usage counter "2/3 analisis bulan ini" (free) atau "12/50" (pro)
- Clear upgrade CTA when approaching limit

#### Results View
- Living Document with collapsible sections
- Readiness Score badge (prominent, color-coded)
- Gap list with severity indicators
- Clarification questions with answer input
- "Generate Full PRD" button (Pro only, with upgrade CTA for free)
- Watermark on free output: "Generated by StoryForge.id — Upgrade untuk menghapus watermark"

#### Dashboard (`/dashboard`)
- Analysis history list (sorted by date)
- Quick stats: total analyses, average score, trend
- Pro: Score trend chart over time
- Pro: Saved clarifications library

#### Settings (`/settings`)
- Account info (email, plan, usage)
- Subscription management (upgrade/downgrade/cancel)
- Security (logout, logout all, delete account)
- Notification preferences

---

## 📊 Analysis Output Format (v2.0)

### Gap Analysis
```json
{
  "gapList": [
    {
      "category": "Business Context | Functional | Non-Functional | User & Role | Edge Cases",
      "description": "...",
      "severity": "high | medium | low",
      "confidence": 0.0-1.0,
      "reference": "quoted text from BRD"
    }
  ]
}
```

### Clarification Questions
- Bahasa Indonesia
- Grouped by category
- Copy-paste ready format for stakeholder communication

### Readiness Score
| Score | Label | Color | Meaning |
|---|---|---|---|
| 80-100 | Siap | Green | Ready to build |
| 50-79 | Perlu Klarifikasi | Yellow | Needs answers |
| 0-49 | Tidak Siap | Red | Major gaps |

### PRD Document (Pro)
Multi-section structured document:
1. **Foundation** — Summary, gaps, score, assumptions, out-of-scope
2. **Roles & Personas** — User roles, RACI matrix
3. **User Flow** — Step-by-step flows, happy path + edge cases
4. **Engineer Spec** — Technical requirements, API contracts, data models
5. **Designer Spec** — UI requirements, wireframe descriptions
6. **QA Spec** — Test scenarios, acceptance criteria
7. **Templates** — Ready-to-use Jira/Linear ticket templates
8. **Stakeholder Brief** — Executive summary for non-technical stakeholders

---

## 🚀 Launch Plan

### Phase 1: Launch-Ready (Mei W4 – Juni W2)

| Task | Priority | Status |
|---|---|---|
| Remove guest mode entirely | P0 | To do |
| Require signup for all users | P0 | To do |
| Fix UX: clear free vs pro boundaries | P0 | To do |
| Add watermark on free output | P0 | To do |
| Manual bank transfer payment flow | P0 | To do |
| Landing page redesign (conversion-focused) | P0 | To do |
| Usage counter in header | P1 | To do |
| Upgrade CTA at limit | P1 | To do |
| Domain registration (storyforge.id) | P0 | Pending |
| Email setup (Cloudflare) | P0 | Pending |
| William onboarding | P0 | Blocked on domain |

### Phase 2: Retention (Juni W3-4)

| Task | Priority |
|---|---|
| Welcome email (Resend) | P1 |
| 3-day inactive reminder | P1 |
| Usage limit approaching email | P1 |
| Score trend chart (Pro) | P2 |
| Saved clarifications (Pro) | P2 |
| Free tier auto-cleanup (5 history max) | P2 |
| Export to Markdown/PDF (Pro) | P2 |

### Phase 3: Growth (Juli)

| Task | Priority |
|---|---|
| Xendit subscription integration | P1 |
| Max tier launch | P1 |
| Referral system (invite = +1 free analysis) | P2 |
| Admin dashboard (WAA, revenue, users) | P2 |
| Mobile UX optimization | P2 |
| SEO + content marketing | P3 |

### Phase 4: Scale (Agustus+)

| Task | Priority |
|---|---|
| Team/workspace features | P2 |
| Jira/Linear integration | P3 |
| Custom AI model fine-tuning | P3 |
| Enterprise tier | P3 |
| API access for developers | P3 |

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| API cost abuse | High | Usage caps + server-side enforcement |
| Low conversion free→pro | High | Generous free tier to hook, clear value prop for Pro |
| Payment friction (manual) | Medium | Clear instructions, fast verification (<24h) |
| Churn after first month | Medium | Retention emails, score trend (show value over time) |
| Competitor (ChatGPT/Claude direct) | Medium | Specialized UX, Bahasa Indonesia, structured output |
| Supabase bandwidth | Low | Usage alerts + auto cleanup |
| Data leak | Low | RLS + ZDR + UU PDP compliance |

---

## 📈 Unit Economics (v2.0)

| Item | Free (Gemini Flash) | Pro (Claude Haiku) | Team/seat (Claude Sonnet) |
|---|---|---|---|
| Revenue/mo | Rp 0 | Rp 199.000 | Rp 149.000/seat |
| API cost (avg) | **Rp 15** (3 analyses) | Rp 25.000 (50 analyses) | Rp 120.000 (100 analyses) |
| Infra (Supabase + Vercel) | Rp 2.000 | Rp 15.000 | Rp 10.000/seat |
| Payment fee | — | Rp 8.500 | Rp 6.000/seat |
| **Net margin/seat** | **-Rp 2.015** | **Rp 150.500 (76%)** | **Rp 13.000 (9%)** |
| **Net margin (5 seats)** | — | — | **Rp 65.000 total** |
| **Net margin (10 seats)** | — | — | **Rp 130.000 total** |

**Note:** Team tier margin per seat is thin because of Sonnet pricing. But:
- Teams buy 3-10 seats → total revenue Rp 447k-1.49jt/month
- Team churn is much lower than individual (switching cost = whole team workflow)
- Team LTV is 3-5x individual Pro LTV

**Alternative:** Use Claude Haiku for Team tier too (same as Pro) → margin jumps to 67%/seat. Offer Sonnet as optional "Premium Analysis" toggle (costs 1 extra analysis credit per use).

**Break-even:** 5 Pro users OR 1 team of 5 seats
**Target Rp 100jt/year:** 42 Pro users OR 5 teams of 5 seats OR mix

**Why Free tier is now sustainable:**
- Old cost (Claude Haiku for all): Rp 1.500/free user/month → 1000 free users = Rp 1.5jt/month loss
- New cost (Gemini Flash): Rp 15/free user/month → 1000 free users = Rp 15k/month loss (negligible)

---

## 🔒 Compliance & Security

- **UU PDP:** Right to erasure (account deletion), consent tracking, data minimization
- **ZDR:** Anthropic Zero Data Retention header on all API calls
- **RLS:** Row-level security on all Supabase tables
- **Auth:** Supabase Auth with PKCE flow, rate limiting, brute-force protection
- **Privacy Policy:** `/privacy` — data collection, usage, retention, deletion
- **Terms of Service:** `/terms` — acceptable use, liability, payment terms

---

## 📋 Success Criteria for v2.0 Launch

| Metric | Target | Measurement |
|---|---|---|
| WAA (Week 1) | ≥ 5 | Supabase query |
| Signup rate | ≥ 30% of landing visitors | Vercel Analytics |
| Analysis completion | ≥ 80% | analysis_events table |
| First Pro conversion | ≥ 1 within 14 days | subscriptions table |
| NPS (beta users) | ≥ 40 | Manual survey |
| Uptime | ≥ 99.5% | Vercel status |
| P95 analysis time | < 30 seconds | analysis_events.duration_ms |

---

## 📄 Related Documents

- [[01-Product/PRD-v1.5|PRD v1.5]] — Previous version (superseded)
- [[01-Product/North-Star-Metric|North Star Metric]] — WAA deep dive
- [[01-Product/Compliance|Compliance Package]] — Privacy, ToS, UU PDP
- [[02-Tech/API-Architecture|API Architecture]] — Technical deep dive
- [[00-Index|Index]] — Navigation hub

---

**Changelog from v1.5:**
- Repositioned from "BRD Gap Analysis" to "The BRD Quality Gate"
- Added competitive positioning vs ChatPRD and ChatGPT/Claude
- Removed guest mode — all users must sign up
- Added Max tier (Rp 499k/mo)
- Tiered AI model strategy: Gemini Flash (free) / Claude Haiku (pro) / Claude Sonnet (max)
- Free tier now near-zero cost (Rp 15/user vs Rp 1.500)
- Pro margin improved from 58% to 76%
- Added full PRD document generation as core Pro feature
- Added export capability (Markdown/PDF)
- Added retention email strategy
- Updated timeline to reflect current state (most features already built)
- Added Phase 3-4 growth roadmap
- Emphasized Readiness Score as primary differentiator
- Added "quality gate workflow" as moat strategy
