# Session: GitHub SaaS Repo Research

**Date:** 2026-06-05 (WIB)
**Status:** Research complete
**Branch:** Current workspace; no code changes

---

## What this was

Researched GitHub repositories that could strengthen StoryForge's path toward a production-ready SaaS. The goal was to find a repo worth using as a reference or selective source of patterns, not to replace the existing StoryForge codebase.

## Recommendation

Use **KolbySisk/next-supabase-stripe-starter** as the best practical reference repo for StoryForge's current stack.

Why:

- It matches StoryForge's direction: Next.js, Supabase auth/database, Stripe-style subscription logic, Resend/email, Vercel deployment, Supabase migrations, and webhook-driven billing sync.
- It is more directly transferable than the official `nextjs/saas-starter`, which is stronger as a general SaaS reference but uses Postgres + Drizzle rather than StoryForge's current Supabase-first architecture.
- The most reusable parts are billing data modeling, webhook synchronization, Supabase migration shape, account/subscription pages, and production setup checklist.

## Secondary References

- `nextjs/saas-starter` — best official reference for teams, RBAC, activity logs, Stripe checkout/customer portal, and protected route patterns.
- `vercel/nextjs-subscription-payments` — useful historical Supabase + Stripe reference, but sunset and replaced by `nextjs/saas-starter`.
- `antoineross/Hikari` — not recommended as primary because it is explicitly marked work-in-progress.

## Fit for StoryForge

Do not clone a starter over StoryForge. Treat the selected repo as a pattern library and port only narrow production pieces:

1. Subscription state schema and entitlement checks.
2. Billing webhook idempotency and sync flow.
3. Account/billing settings UX.
4. Environment variable and launch checklist structure.
5. Email flow patterns where they align with Resend.

## Next Steps

- Keep current StoryForge architecture.
- Add a billing/entitlement implementation plan when Xendit or Stripe timing is decided.
- For beta, continue manual bank transfer, but model the database as if automated subscriptions will arrive later.

No files outside the Obsidian vault were changed.
