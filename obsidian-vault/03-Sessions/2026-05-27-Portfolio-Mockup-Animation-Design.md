# Session: Portfolio — Mockup Animation & Design Fixes
**Date:** 2026-05-27
**Status:** ✅ Complete — All changes tested and live on production

---

## ✅ Completed Tasks

- ✅ **Animated phone mockups added** — 3-phone floating group (kanbanbot.online style) added to BAF and Danamas case study pages. Center phone floats straight, side phones tilted ±7° with staggered timing. Blue glow behind center.
  - BAF: Home → Payment methods (BLU/BRI/BNI expanded) → Success screen
  - Danamas: Lender onboarding → Lender dashboard → Reksadana detail with NAV chart
  - New component: `src/components/PhoneMockupGroup.astro`
  - Screenshots sourced from `src/Product/BAF Mobile/` and `src/Product/Danamas/`
  - `phoneScreens` + `phoneScreensLabel` fields added to content schema

- ✅ **Service cards link to /contact** — PM Consulting and PM Portfolio Building cards converted from `<div>` to `<a href="/contact">`. "Get in touch →" CTA added to each card bottom.

- ✅ **Dark mode toggle fixed** — Tailwind v4 defaults dark mode to OS media query, not `.dark` class. Added `@custom-variant dark (&:where(.dark, .dark *))` to `global.css` so the ThemeToggle actually works. Dark stays default.

- ✅ **Light mode text readability fixed** — Case study prose content was showing `text-slate-300` (light gray) in light mode because `[slug].astro` scoped style used `@reference "tailwindcss"` which doesn't inherit the custom dark variant. Fixed by pointing to `@reference "../../styles/global.css"`. `td` color confirmed via computed style: `oklch(0.372)` = slate-700 ✓

- ✅ **All changes pushed to GitHub** — `git push -u origin main` (branch tracking was not set up before this session). All 5 commits now on `origin/main`.

- ✅ **Deployed to production** — Live and tested by user.

---

## 🔑 Key Decisions

- **Tailwind v4 dark mode:** Must use `@custom-variant dark` in CSS + `@reference "path/to/global.css"` in all scoped `<style>` blocks. `@reference "tailwindcss"` alone does not inherit custom variants.
- **Phone mockup placement:** Between the header and the Context table on case study pages — acts as a visual hero before the text-heavy content.
- **3 screens per mockup:** Chosen to tell a visual story (context → feature → outcome) rather than just showing one screenshot.
- **Image location:** Product screenshots copied to `public/images/products/baf/` and `public/images/products/danamas/`. Original source files remain in `src/Product/`.

---

## 📁 Files Changed

```
A   public/images/products/baf/home.jpg
A   public/images/products/baf/payment.jpg
A   public/images/products/baf/success.jpg
A   public/images/products/danamas/dashboard.jpg
A   public/images/products/danamas/onboarding.jpg
A   public/images/products/danamas/reksadana.jpg
A   src/components/PhoneMockupGroup.astro
M   src/content.config.ts              (added phoneScreens schema field)
M   src/content/case-studies/rebuilding-fintech-lending-platform.md   (added phoneScreens)
M   src/content/case-studies/shipping-payment-gateway-integration.md  (added phoneScreens)
M   src/pages/case-studies/[slug].astro  (@reference fix + PhoneMockupGroup render)
M   src/pages/services.astro           (cards → <a href="/contact">)
M   src/styles/global.css              (@custom-variant dark + float keyframes)
```

---

## ➡️ Next Steps (Portfolio)

- [ ] Consider adding the 3rd case study (Cutting Cycle Time) phone mockup if BAF internal tool screenshots become available
- [ ] Review all other pages (about, playbook, contact) for light mode readability — same `@reference` issue may exist in their scoped styles
- [ ] Deploy custom domain when storyforge.id is registered

---

## 🚧 No Blockers

All work is complete and live. No outstanding issues from this session.

---

**Auto-updated by Claude**
