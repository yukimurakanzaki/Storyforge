# Design Document — Manual Payment Flow (Beta)

**Date:** 2026-06-11
**Status:** Ready for review
**Source:** `requirements.md` + trade-off analysis (2026-06-10 session)

## Decisions Resolved Since Requirements

| Topic | Requirements said | Design decision |
|---|---|---|
| Price | Rp 199.000/month | **Rp 149.000/month founding-member beta price** + optional **Rp 399.000/3-month package**. Price lives in one config constant (`lib/payment/config.ts`) so it can change without touching logic. |
| Banks | BCA and Mandiri | **BCA only** (owner has a personal BCA account). Schema keeps `bank_destination` column for future banks. |
| Verification matching | Unique code | Unique-amount code (Rp 149.XXX) because personal accounts cannot issue Virtual Accounts. Proof image is backup evidence, the amount is the primary matcher. |

## Overview

Beta-grade operationally (manual verification by one admin), production-grade for security, entitlement enforcement, authorization, and auditability. The Subscription_Engine is **gateway-agnostic**: activation, expiry, and grace logic never reference the payment method, so Xendit can replace the manual flow later without touching entitlements.

```
User                        System                              Admin (owner)
────                        ──────                              ─────────────
/pricing → "Upgrade"  →     create payment_intent
                            (code 001–999, expires 24h)
sees: BCA acct + Rp 149.XXX
transfers via m-banking
uploads bukti transfer →    store in PRIVATE bucket       →    email: "Bukti masuk"
                            status: pending_verification
                                                                /admin/payments
                                                                sees proof + amount + email
                                                                Approve (idempotent) / Reject
                            on approve:
                            subscription → pro, 30d (or +30d if renewal)
                            usage reset, confirmation email
                            payment_events appended
H-3: reminder email
expiry: 3-day grace (computed dynamically)
grace end: free limits enforced
```

## Data Model

New migration `supabase/migrations/012_manual_payments.sql`.

### Table: `manual_payments`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK default gen_random_uuid()` | |
| `user_id` | `uuid FK auth.users NOT NULL` | |
| `package` | `text CHECK (package IN ('monthly','quarterly'))` | monthly = 30 days, quarterly = 90 days |
| `base_amount` | `integer NOT NULL` | 149000 or 399000 (snapshot at creation — price changes never break pending payments) |
| `unique_code` | `integer NOT NULL CHECK (unique_code BETWEEN 1 AND 999)` | |
| `total_amount` | `integer NOT NULL` | `base_amount + unique_code` — the exact amount the user must transfer |
| `bank_destination` | `text NOT NULL DEFAULT 'BCA'` | |
| `proof_path` | `text` | **Storage path, not public URL** (private bucket) |
| `status` | `text CHECK (status IN ('awaiting_transfer','pending_verification','approved','rejected','expired'))` | |
| `rejection_reason` | `text` | shown to user in rejection email |
| `expires_at` | `timestamptz NOT NULL` | created_at + 24h; pending instructions past this are `expired` |
| `submitted_at` | `timestamptz` | when proof uploaded |
| `verified_at` | `timestamptz` | |
| `verified_by` | `uuid` | admin user id |
| `created_at` / `updated_at` | `timestamptz` | |

**Code uniqueness (Req 2.2):** partial unique index on `unique_code` `WHERE status IN ('awaiting_transfer','pending_verification')` — a code is reusable once its payment is approved/rejected/expired. Generation retries on collision (999 codes vs beta volume — collisions are rare).

### Table: `payment_events` (append-only audit, Req 9)

| Column | Type |
|---|---|
| `id` | `uuid PK` |
| `payment_id` | `uuid FK manual_payments` |
| `actor` | `text` — 'user', 'admin', 'system' |
| `event` | `text` — created, proof_uploaded, approved, rejected, expired, subscription_activated, reminder_sent, grace_entered, downgraded |
| `detail` | `jsonb` |
| `created_at` | `timestamptz` |

No UPDATE/DELETE policies on this table — insert-only, even for admins.

### Table: `subscriptions`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid PK` | |
| `plan` | `text CHECK (plan IN ('free','pro'))` | |
| `expires_at` | `timestamptz` | NULL for free |
| `reminder_sent_for` | `timestamptz` | equals current `expires_at` once H-3 reminder sent → guarantees exactly-once per period (Req 6.2) |
| `activated_at` / `updated_at` | `timestamptz` | |

**Status is computed, never trusted from a column** (Req 7, trade-off decision):

```ts
function subscriptionStatus(sub): 'active' | 'grace_period' | 'expired' | 'free' {
  if (!sub || sub.plan === 'free') return 'free'
  const now = Date.now(), exp = +sub.expires_at
  if (now <= exp) return 'active'
  if (now <= exp + 3 * DAY) return 'grace_period'
  return 'expired'
}
```

No scheduled downgrade job is required for correctness; a daily QStash job exists only for reminder emails and cosmetic cleanup.

### RLS

- `manual_payments`: user SELECT/INSERT own rows; status updates only via server routes (service role — client never updates status). Admin (role check via `lib/auth/admin.ts` `getAdminStatus()`) reads all.
- `payment_events`: insert via server routes only (service role); admin SELECT.
- `subscriptions`: user SELECT own row; writes via service role only.
- Storage bucket `payment-proofs`: **private**. Upload via signed upload URL from the server; admin views via short-lived signed URL. Path: `{user_id}/{payment_id}.{ext}`.

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/payment/intent` | POST | user | Create payment: pick package → generate code → return instructions `{ bank, accountNumber, accountName, totalAmount, expiresAt }`. If user already has a non-expired `awaiting_transfer` intent, return it (don't stack codes). |
| `/api/payment/proof` | POST | user | Validate file (JPEG/PNG/WebP ≤ 5 MB — checked server-side by magic bytes + size, not just extension), store to private bucket, set `pending_verification`, append event, **email admin** ("Bukti transfer masuk dari {email}"). |
| `/api/payment/status` | GET | user | Current payment + subscription status for /pricing UI. |
| `/api/admin/payments` | GET | admin | List, filterable by status + date range (Req 9.3), oldest-first for pending (Req 4.1). Returns signed proof URLs (60s TTL). |
| `/api/admin/payments/[id]/approve` | POST | admin | **Idempotent**: if already `approved`, return current state, change nothing. Else: approve + activate subscription in one transaction (RPC `approve_payment`), append events, send confirmation email. |
| `/api/admin/payments/[id]/reject` | POST | admin | Requires `reason`; sets `rejected`, appends event, emails user the reason in Bahasa Indonesia with a retry link. |

### Activation rules (Req 5 + renewal trade-off decision)

- Duration: monthly = 30 days, quarterly = 90 days.
- **New/expired user:** `expires_at = verified_at + duration`.
- **Renewal while still active or in grace:** `expires_at = max(current expires_at, now) + duration` — renewing early never costs the user remaining days.
- Usage counter reset to 0, limit set per plan (Req 5.3) — but on renewal-while-active, do **not** reset the counter mid-cycle (prevents 100-analyses-by-double-pay exploit); the limit refreshes on the natural monthly cycle.
- Confirmation email (Resend): activation + expiry dates, Bahasa Indonesia.

## Entitlement Enforcement (Req 8)

Single server-side helper, the only source of truth:

```ts
// lib/payment/entitlements.ts
async function getEntitlements(userId): Promise<{
  plan: 'free' | 'pro'
  status: 'free' | 'active' | 'grace_period' | 'expired'
  analysesLimit: number      // 3 | 50
  wordLimit: number          // 5000 | 10000
  watermark: boolean
}>
```

- Called by every gated route: `/api/workspace`, `/api/workspace/prd`, export endpoints.
- `grace_period` ⇒ Pro limits (Req 7.1/8.3).
- **DB error ⇒ fail-closed to free limits + log** (Req 8.4).
- Never trust client-sent plan/tier values.

## UI

### `/pricing` (public, Bahasa Indonesia, mobile ≥320px, WCAG AA)

- Comparison table Free vs Pro; Pro card: **Rp 149.000/bln** with "Harga Founding Member — naik ke Rp 199rb setelah launch publik" + quarterly option "Rp 399.000/3 bulan (hemat Rp 48rb)".
- Active Pro user sees status + expiry date instead of upgrade button (Req 1.3); grace user sees warning banner "Langganan berakhir — sisa masa tenggang X hari" + renew CTA (Req 7.2).
- "Upgrade ke Pro" → instruction view: BCA account number + name, **exact amount Rp 149.XXX prominently** with "transfer dengan jumlah PERSIS sampai 3 digit terakhir", copy buttons for account number and amount, 24h countdown, then proof-upload dropzone.
- After upload: "Bukti diterima. Verifikasi maksimal 24 jam — kamu akan menerima email saat Pro aktif."

### `/admin/payments` (admin role only, Req 4.5)

- Pending queue oldest-first: proof image (signed URL), user email, expected amount + code, submitted time.
- Approve / Reject (reason required) buttons; history tab with status + date filters.

## Watermark (free tier, related to Req 8.2)

Single quiet footer line appended to free-tier copy/export output:

> `— Dibuat dengan StoryForge.id (Gratis) · storyforge.id`

In-app, a small note near the export actions: "Upgrade ke Pro untuk menghapus watermark." No overlay on the content itself — free output must stay usable so it spreads.

## Emails (Resend, Bahasa Indonesia)

| Trigger | To | Content |
|---|---|---|
| Proof uploaded | Admin | user email + amount + admin panel link |
| Approved | User | "Pro aktif sampai {date}" |
| Rejected | User | reason + retry link |
| H-3 expiry (daily QStash job; exactly-once via `reminder_sent_for`) | User | expiry date + /pricing link |

## Error Handling

- Upload validation errors in Bahasa Indonesia naming the violated constraint (Req 3.5): "Ukuran file maksimal 5 MB" / "Format harus JPG, PNG, atau WebP".
- Intent creation collision: retry code generation up to 5x, then 500 with friendly message.
- Approve on expired/rejected payment: 409 with current state.
- All admin routes verify `getAdminStatus()` server-side; 403 otherwise.

## Build Phases

1. **Phase A (launch-blocking):** migration + config, intent route, /pricing + instructions + proof upload, admin queue + approve/reject, activation + entitlement helper wired into gated routes, confirmation/rejection emails.
2. **Phase B (week 1 post-launch):** H-3 reminder job, grace banner, admin history filters, admin-notify email.
3. **Phase C (post-beta):** Xendit on the same Subscription_Engine.

## Testing Strategy

- Unit: `subscriptionStatus` boundaries (expiry instant, grace day 3, day 4), code-generation uniqueness/retry, entitlement fail-closed on DB error, renewal extension math (active/grace/expired), reminder exactly-once.
- Integration: intent → upload → approve → entitlements flip to Pro; double-approve idempotency; reject → email payload; unauthenticated/non-admin 401/403 on admin routes; oversized/wrong-format upload rejected server-side.
- E2E (Playwright): pricing → instructions → upload → (admin approves) → Pro badge visible.

## Security Checklist

- [ ] Proof bucket private; signed URLs only, short TTL
- [ ] Status transitions server-side only (service role); client can never set `approved`
- [ ] Admin role checked server-side on every admin route
- [ ] Approval idempotent + transactional (RPC)
- [ ] `payment_events` append-only
- [ ] Entitlements fail-closed
- [ ] File type validated by content, not extension
- [ ] Amounts snapshotted per payment (price changes don't corrupt pending payments)
