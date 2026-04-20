# 📋 StoryForge Project Index

**Last Updated:** 2026-04-05 (19:30 WIB)
**Status:** Pre-MVP, API live + domain secured

---

## 🚀 Quick Navigation

### Product
- [[01-Product/PRD-v1.5|PRD v1.5]] — Complete spec, production-ready
- [[01-Product/North-Star-Metric|North Star Metric]] — WAA = Weekly Active Analyzers
- [[01-Product/Compliance|Compliance Package]] — Privacy, ToS, ZDR config
- [[01-Product/Positioning|Positioning]] — Dual segment: PM + Vibe Coder

### Technology
- [[02-Tech/API-Architecture|API Architecture]] — Anthropic claude-haiku-4-5, streaming, ZDR
- [[02-Tech/Database-Schema|Database Schema]] — Supabase tables v1.5
- [[02-Tech/Stack-Rationale|Stack Rationale]] — Why Vercel + Supabase + Anthropic
- [[02-Tech/Decisions|Tech Decisions]] — Trade-offs documented

### Sessions & Progress
- [[03-Sessions/2026-04-05-API-Live|2026-04-05: API Live + Domain Secured]] — **LATEST**
- [[03-Sessions/2026-04-05-API-Fix|2026-04-05: API Fix]] 
- [[03-Sessions/2026-03-29-PRD-Review|2026-03-29: PRD Review]]

### Launch
- [[04-Launch/Beta-Users|Beta Users]] — William + PM A, B, C, D
- [[04-Launch/Compliance-Checklist|Compliance Checklist]] — Pre-launch tasks
- [[04-Launch/Launch-Timeline|Launch Timeline]] — 8-week sprint

### Backlog
- [[05-Backlog/Ideas|Ideas]] — Future features
- [[05-Backlog/User-Feedback|User Feedback]] — From validation
- [[05-Backlog/Tech-Debt|Tech Debt]] — Known issues

---

## 📊 Current Metrics

| Metric | Target | Status |
|---|---|---|
| **WAA (Soft Launch)** | 4 | ⬜ Pre-launch |
| **WAA (30 days)** | 15 | ⬜ Pre-launch |
| **Free → Pro Conversion** | 15% | ⬜ Pre-launch |
| **API Cost per User** | Rp 1.200 | ✅ Calculated |
| **Break-even** | 5 paying users | ✅ Locked |

---

## ✅ Latest Status — 2026-04-05

### Completed ✅

- ✅ **PRD v1.5 locked** — Production-ready, all features spec'd
- ✅ **API architecture fixed** — Anthropic claude-haiku-4-5 server-side, ZDR header active
- ✅ **Positioning dual segment defined** — PM Indonesia + Vibe Coders
- ✅ **ANTHROPIC_API_KEY in Vercel** — Environment variable added
- ✅ **End-to-end test passed** — BRD analysis working, output correct
- ✅ **Domain storyforge.id available** — Ready to register

### In Progress 🔄

- 🔄 **Register domain storyforge.id** — Next action
- 🔄 **Setup email forwarding** — privacy@storyforge.id, hello@storyforge.id (via Cloudflare)
- 🔄 **Message William** — Share beta link, reactivate commitment
- 🔄 **Compliance pages** — Publish /privacy, /terms on domain

### Blocked ⬜

- ⬜ **William onboarded** — Waiting for domain + compliance pages
- ⬜ **Beta subdomain setup** — Waiting for domain (beta.storyforge.id)
- ⬜ **Supabase schema migration** — Ready, waiting for domain + email setup
- ⬜ **Soft launch Week 8** — On track if domain done this week

---

## 🎯 Immediate Next Steps (This Week)

### Day 1 (Today — Friday)
- [ ] Register **storyforge.id** (Niagahoster, Rumahweb, or Namecheap)
  - Budget: Rp 200–300k/year
  - Duration: 5–10 minutes
- [ ] Confirm registration & nameserver pointing to Vercel

### Day 2–3 (Weekend)
- [ ] Setup **email forwarding** via Cloudflare
  - `privacy@storyforge.id` → personal email
  - `hello@storyforge.id` → personal email
- [ ] Publish `/privacy` page on Vercel
  - Copy from Compliance-Package-v1.0.docx
  - Point domain to this page
- [ ] Publish `/terms` page on Vercel

### Day 4–5 (Monday–Tuesday)
- [ ] Point custom domain to Vercel
  - Add domain to Vercel project
  - Wait for SSL cert (auto, ~1 min)
- [ ] Message **William**
  - Share beta link: `https://storyforge.id` or `https://app.storyforge.id`
  - Reactivate commitment: "Ready untuk trial next week?"
  - Expected: confirmation + first analysis

### Day 6–7 (Wednesday–Thursday)
- [ ] Backup plan if William unresponsive:
  - Use sample BRD to test full flow
  - Document everything as portfolio artifact
  - Prepare for pitch deck with "live demo"

---

## 🏗️ Architecture Status

| Component | Status | Notes |
|---|---|---|
| **Frontend** | ✅ Live | Next.js on Vercel, streaming UI working |
| **API Route** | ✅ Live | `/api/analyze` with Anthropic claude-haiku-4-5 |
| **ZDR Header** | ✅ Configured | Privacy-preserving, no data retention |
| **Supabase** | ⏳ Pending | Schema ready, waiting for go-live signal |
| **Domain** | ⏳ Pending | storyforge.id available, need registration |
| **Email** | ⏳ Pending | Forwarding via Cloudflare, ready to setup |
| **Payment** | ⏳ Phase 2 | Manual bank transfer for beta, Xendit after |

---

## 💰 Unit Economics (Locked)

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

## 🎯 Key Decisions (Locked)

1. **API Model:** claude-haiku-4-5 (cost-efficient, structured tasks)
2. **Freemium Boundary:** 3 analyses/month free, 50/month pro
3. **Pro Anchor Feature:** Company Context (persistent, injected into prompt)
4. **North Star Metric:** WAA (Weekly Active Analyzers)
5. **Beta Payment:** Manual bank transfer (Xendit phase 2)
6. **Launch Timeline:** 8 weeks from now (soft launch Week 8)

---

## 📋 Pre-Launch Checklist

| # | Task | Priority | Status |
|---|---|---|---|
| 1 | Register storyforge.id | 🔴 BLOCKER | ⬜ Today |
| 2 | Setup email forwarding | 🔴 BLOCKER | ⏳ Depends on #1 |
| 3 | Publish /privacy page | 🔴 BLOCKER | ⏳ Depends on #1 |
| 4 | Publish /terms page | 🔴 BLOCKER | ⏳ Depends on #1 |
| 5 | Point custom domain to Vercel | 🟠 Critical | ⏳ Depends on #1 |
| 6 | Test William onboarding | 🟠 Critical | ⏳ Depends on #5 |
| 7 | Supabase schema migration | 🟠 Important | ⏳ Ready, trigger after #6 |
| 8 | Xendit integration | 🟡 Nice-to-have | ⏳ Phase 2 |

---

## 🌟 Momentum Check

**What's Working:**
- ✅ API live and tested
- ✅ BRD analysis output correct + format good
- ✅ Streaming UI smooth
- ✅ Zero data retention (privacy) implemented
- ✅ Product-market fit signal from 3/4 PMs willing to pay

**What's Blocking:**
- ⏳ Domain registration (1 day)
- ⏳ Email setup (1 day)
- ⏳ Compliance pages live (1 day)
- ⏳ William onboarding (depends on above 3)

**Timeline Risk:**
- Low — all blockers are mechanical, not technical
- Domain → Email → Compliance → William = 3–4 days max
- Still on track for soft launch Week 8

---

## 📞 Quick Links

- **Product Spec:** [[01-Product/PRD-v1.5|PRD v1.5]]
- **Revenue Model:** [[01-Product/North-Star-Metric|North Star Metric]]
- **Tech Stack:** [[02-Tech/API-Architecture|API Architecture]]
- **Compliance:** [[01-Product/Compliance|Compliance Package]]

---

**Session Log:** [[03-Sessions/2026-04-05-API-Live|2026-04-05: API Live + Domain Secured]]

**Auto-updated by Claude**