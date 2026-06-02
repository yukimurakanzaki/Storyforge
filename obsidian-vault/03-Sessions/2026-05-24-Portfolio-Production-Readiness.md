# Session: Portfolio Production Readiness
**Date:** 2026-05-24
**Project:** Personal Portfolio (Astro · Tailwind · Vercel)
**Status:** Pre-deploy audit complete — portfolio is production-ready pending 3 non-blocking items

---

## ✅ Completed Tasks

### Production Readiness Audit
- ✅ **Full pre-deploy audit** — Identified 5 blockers + 3 warnings across 10 built pages
- ✅ **Build verified clean** — `npm run build` passes 0 errors throughout entire session

### Technical Fixes Applied
- ✅ **OG + Twitter meta tags** — Added 8 social sharing meta tags to `Layout.astro` (og:title, og:description, og:url, og:type, og:image, twitter:card, twitter:title, twitter:description)
- ✅ **`public/robots.txt` created** — `Allow: /` for all crawlers
- ✅ **`[your hosting provider]` fixed** — Replaced with "Vercel" in `how-i-built-this.astro`
- ✅ **Ghost file deleted** — `public/images/profile.jpg.png` (double-extension artifact) removed
- ✅ **Homepage deep-links confirmed** — Already working via content collection + CaseStudyCard component; no change needed

### Content Filled — About Page
- ✅ **Bio** — 4-paragraph prose (current role at BAF, Danamas background, StoryForge side project, Jakarta + open to SG/KL)
- ✅ **Career History** — Vertical timeline with dot-line connector: BAF → Danamas → SiCepat → pre-PM roles → Education
- ✅ **What I'm Looking For** — 4 structured cards: Role / Indonesia / SEA horizon / What matters to me
- ✅ **StoryForge.id** — Full section with 3-paragraph copy + stack tags; "Launching soon" pulsing badge (link disabled — domain not yet live)

### Content Filled — Contact Page
- ✅ **Contact Form placeholder removed** — Deleted entirely; email + LinkedIn sufficient for now
- ✅ **Location & Availability section added** — 4-tile grid: Jakarta (WFO/Hybrid) / WIB UTC+7 / Remote open / SG & KL (18–24 month horizon)

### BAF Title Update — All Occurrences
- ✅ **`about.astro`** — Career History BAF entry: "Product Manager *(Official Title: Product Owner & UI/UX Specialist)*"
- ✅ **`cutting-cycle-time.md`** — `subtitle` frontmatter + Context table `Role` row
- ✅ **`shipping-payment-gateway-integration.md`** — `subtitle` frontmatter + Context table `Role` row
- ✅ **grep verified** — "Product Owner" appears in exactly 5 places, nowhere unexpected; Danamas/SiCepat/prose untouched

---

## 🚧 Blockers / Open Items

- 🚧 **CV PDF not updated** — `public/MuhammadAdiPutra_CV.pdf` still shows old BAF title. Must update in source (Word/Google Docs/Canva), re-export, and replace the file in `public/`
- 🚧 **No sitemap.xml** — `@astrojs/sitemap` not installed; `astro.config.mjs` has no `site:` URL. Google won't auto-discover case study detail pages. Install: `npx astro add sitemap` + add `site: 'https://[domain]'` to config
- 🚧 **StoryForge.id domain not live** — All links to storyforge.id are disabled/replaced with "Launching soon" badge. Re-enable once domain is registered and deployed
- 🚧 **No contact form** — Placeholder removed, email + LinkedIn only for now. Add Formspree or Netlify Forms later if needed

---

## ➡️ Next Steps

1. **Update CV PDF** — Open source file, change BAF title to "Product Manager (Official Title: Product Owner & UI/UX Specialist)", re-export, drop into `public/MuhammadAdiPutra_CV.pdf`
2. **Register domain** — Confirm final domain (muhammadadiputra.dev or similar), then update `og:url` hardcode in `Layout.astro`
3. **Install sitemap** — `npx astro add sitemap` → add `site: 'https://[confirmed-domain]'` → rebuild → verify sitemap.xml in dist/
4. **Deploy to Vercel** — Connect repo, set build command `npm run build`, output dir `dist/`
5. **Re-enable StoryForge links** — Update `about.astro` once storyforge.id is live: replace `<span>Launching soon</span>` with actual `<a href>` links

---

## 🔑 Key Decisions

- **BAF title display pattern** — Show as "Product Manager" (industry-readable) with "(Official Title: Product Owner & UI/UX Specialist)" in a muted weight immediately after. Applied consistently across About timeline + both BAF case study detail pages.
- **StoryForge.id links disabled** — Rather than linking to a dead domain, replaced with an amber "Launching soon" pulsing badge in About page. No broken links in production.
- **Contact Form removed, not stubbed** — Placeholder dashed box deleted entirely; cleaner than showing an unfinished widget to recruiters.
- **Homepage deep-links** — The current code already pulls from content collection via `CaseStudyCard`, so each preview card correctly deep-links to its detail page. No custom slug mapping needed.

---

## 📁 Files Changed

### Modified (tracked)
```
M  src/layouts/Layout.astro          — OG/Twitter meta tags added
M  src/pages/about.astro             — Full content: Bio, Career, Looking For, StoryForge; BAF title updated
M  src/pages/contact.astro           — Removed form placeholder; Location & Availability section added
M  src/pages/how-i-built-this.astro  — [your hosting provider] → Vercel
```

### New / Untracked (never committed)
```
A  public/robots.txt
A  src/content/case-studies/cutting-cycle-time.md               — BAF title updated (subtitle + Role)
A  src/content/case-studies/shipping-payment-gateway-integration.md — BAF title updated (subtitle + Role)
A  src/content/case-studies/rebuilding-fintech-lending-platform.md  — Unchanged (Danamas role)
A  src/components/CaseStudyCard.astro
A  src/components/Nav.astro, Footer.astro, ThemeToggle.astro, SkillTag.astro
A  src/content.config.ts
A  src/pages/case-studies/[slug].astro
```

### Deleted
```
D  public/images/profile.jpg.png    — Ghost file with double extension removed
```

---

**Build status at session end:** ✅ `npm run build` — 0 errors, 10 pages generated
