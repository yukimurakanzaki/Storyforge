# North Star Metric — Weekly Active Analyzers

**Created:** 2026-03-21
**Source:** NorthStar-Metric-StoryForge-v1_0-2026-03-21.docx

---

## Definisi

**Weekly Active Analyzers (WAA)**
= Unique users yang run ≥1 analisis BRD dalam rolling 7-hari terakhir

---

## Kenapa WAA (bukan alternative)?

| Kandidat | Masalah | Status |
|---|---|---|
| Registered users | Vanity metric | ❌ Rejected |
| Paying users | Lagging (late signal) | ❌ Rejected |
| Analyses/bulan | Can inflate from 1 power user | ❌ Rejected |
| Retention 3x/bulan | Composite, hard to debug | ❌ Rejected |
| **WAA** | **Leading indicator, actionable** | **✅ CHOSEN** |

---

## Target WAA per Fase

| Phase | Target | Notes |
|---|---|---|
| Soft launch (minggu 6–7) | 4 | PM A, B, C, D semua aktif |
| 30 hari post-launch | 15 | Mulai organic dari referral |
| 60 hari post-launch | 35 | Confident untuk fase 2 expansion |
| Ongoing (sehat) | 50+ | ≈84 paying users @ 30% conversion |

⚠️ Target aspirational — adjust setelah minggu ke-2 based on actual data.

---

## Metric Tree (Debug Framework)
Weekly Active Analyzers (WAA) ├── New Users/Week │ └── Driver: Onboarding conversion rate ├── Returning Users/Week │ └── Driver: Retention hook effectiveness └── Reactivated Users/Week └── Driver: Paywall friction balance
### Kalau WAA Turun — Debug Priority

| Order | Check | Key Q |
|---|---|---|
| 1 | New users | Acquisition ok? Check traffic + onboarding funnel |
| 2 | Returning users | Retention hooks ok? Check email open rate |
| 3 | Reactivated users | Paywall balance ok? Check free tier conversion |

---

## How to Track (Supabase)

**Table:** `analysis_events`
```sql
CREATE TABLE analysis_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id),
  event_type  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Query WAA:**
```sql
SELECT COUNT(DISTINCT user_id) AS waa
FROM analysis_events
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND event_type = 'analysis_completed';
```

---

## Related

- [[01-Product/PRD-v1.5|PRD v1.5]]
- [[02-Tech/Database-Schema|Database Schema]]