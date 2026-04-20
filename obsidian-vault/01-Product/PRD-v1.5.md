# PRD v1.5 — StoryForge BRD Readiness Check

**Version:** 1.5
**Date:** 2026-03-29
**Owner:** Adi
**Status:** ✅ Production-ready

---

## 📝 Overview

StoryForge.id adalah SaaS untuk PM Indonesia yang membantu gap analysis dari BRD sebelum sprint grooming.

**Input:** BRD (free text, bilingual)
**Output:** 
1. Gap List (terstruktur per kategori)
2. Clarification Questions (siap copy-paste ke stakeholder)
3. Readiness Score (0–100 dengan label)

---

## 🎯 North Star Metric

**Weekly Active Analyzers (WAA)**
- Unique users yang run ≥1 analisis per 7 hari

| Timeline | Target | Notes |
|---|---|---|
| Minggu 8 (beta) | 4 | PM A, B, C, D |
| 30 hari | 15 | Organic referral |
| 60 hari | 35 | Confident phase 2 |
| Ongoing | 50+ | ≈84 paying @ 30% conv |

---

## 💰 Freemium Model

| Feature | Free | Pro (Rp 199k) |
|---|---|---|
| Analisis/bulan | 3x | 50x |
| BRD length | 5k kata | 10k kata |
| Output watermark | ✅ | ❌ |
| **Company Context** | ❌ | ✅ NEW |
| **History BRD** | 5 max | Unlimited (90d) |
| **Saved Clarifications** | ❌ | ✅ NEW |
| **Score Trend Chart** | ❌ | ✅ NEW |

---

## 🟣 v1.5 Changes (vs v1.4)

- **Persistent storage per user** — no more session-only
- **Company Context** — Pro anchor feature, inject ke prompt
- **History Dashboard** — BRD history + score trend
- **Saved Clarifications** — label + organize per project
- **Free tier limit** — maks 5 history entries (auto-cleanup)
- **RLS Supabase** — row-level security on all persistent tables
- **Beta payment flow** — manual bank transfer (Xendit phase 2)

---

## 🏗️ Tech Stack

- **Frontend:** Next.js + Vercel
- **Backend:** Vercel Edge Functions
- **Database:** Supabase (PostgreSQL + RLS)
- **AI:** Anthropic API (claude-haiku-4-5, ZDR header)
- **Queue:** Upstash QStash (rate limiting)
- **Payment (beta):** Manual bank transfer
- **Payment (phase 2):** Xendit Subscription
- **Email:** Resend (retention hooks)

---

## 📊 Unit Economics

| Item | Value |
|---|---|
| Revenue per user/mo | Rp 199.000 |
| API cost (50 analyses) | Rp 60.000 |
| Infra (Supabase + Vercel) | Rp 15.000 |
| Payment fee | Rp 8.500 |
| **Net margin** | **Rp 115.500 (58%)** |
| Break-even users | 5 |
| Target Rp 100jt/year | 84 users |

---

## 🚀 Timeline (8 minggu)

| Minggu | Focus                                     |
| ------ | ----------------------------------------- |
| 1–2    | Scaffold + schema + UI + auth             |
| 3      | API + streaming + Readiness Score         |
| 4      | Usage tracking + RLS + free history limit |
| 5      | **Company Context feature**               |
| 6      | History dashboard + retention hooks       |
| 7      | Paywall + watermark + beta payment        |
| 8      | Beta launch + William + WAA tracking      |
|        |                                           |
|        |                                           |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|---|---|
| API cost abuse | Fair use cap 50x/bulan + token limit |
| Webhook spoofing | HMAC signature validation |
| Supabase bandwidth | Usage alert 80% + auto cleanup |
| User churn (payment fail) | Grace period 3d + retry 3x |
| Data leak (persistent storage) | RLS active + auth.uid() filter |

---

## 📄 Related Documents

- [[01-Product/North-Star-Metric|North Star Metric]] — WAA deep dive
- [[01-Product/Compliance|Compliance Package]] — Privacy, ToS, ZDR
- [[02-Tech/API-Architecture|API Architecture]] — Technical deep dive

---

**Full PRD:** See /mnt/project/PRD-StoryForge-v1.5-2026-03-29.docx