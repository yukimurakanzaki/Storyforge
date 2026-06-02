# Session: Portfolio Deploy to Production
**Date:** 2026-05-24
**Project:** Personal Portfolio (Astro · Tailwind · Vercel)
**Status:** ✅ LIVE

---

## ✅ Completed Tasks

- ✅ **Domain confirmed** — `muhammadadiputra.com`
- ✅ **`og:url` + `og:image` updated** — Both URLs now point to `https://muhammadadiputra.com` in `Layout.astro`
- ✅ **`@astrojs/sitemap` installed** — `sitemap-index.xml` now generated at build time covering all 10 pages
- ✅ **`astro.config.mjs` updated** — `site: 'https://muhammadadiputra.com'` + `integrations: [sitemap()]`
- ✅ **All changes committed** — Single clean commit to `main` on `github.com/yukimurakanzaki/Portfolio-`
- ✅ **Pushed to GitHub** — `origin/main` up to date
- ✅ **Deployed to Vercel** — Production deployment ID: `dpl_68QEMKyWTpT5Uc93qfa7xeg8Zh5Z`
- ✅ **CV PDF updated** — User confirmed manual update complete before session

---

## 🌐 Live URLs

| | URL |
|---|---|
| **Vercel URL** | https://portfolio-omjthi1bj-yukimurakanzakis-projects.vercel.app |
| **Vercel Alias** | https://portfolio-murex-ten-81.vercel.app |
| **Inspect** | https://vercel.com/yukimurakanzakis-projects/portfolio/68QEMKyWTpT5Uc93qfa7xeg8Zh5Z |
| **Custom domain** | `muhammadadiputra.com` — **needs to be pointed to Vercel** |

---

## ➡️ One Remaining Step — Point Domain to Vercel

The site is live on Vercel's URL. To make `muhammadadiputra.com` work:

1. Go to **Vercel Dashboard** → Project → **Settings** → **Domains**
2. Add `muhammadadiputra.com` and `www.muhammadadiputra.com`
3. Vercel will show you DNS records to add (usually an A record + CNAME)
4. Log in to your domain registrar (wherever you bought muhammadadiputra.com) and add those records
5. SSL cert provisions automatically (~1–2 min after DNS propagates)

---

## 🚧 On Hold

- **StoryForge.id links in About page** — Currently shows "Launching soon" badge. Re-enable once `storyforge.id` is deployed.

---

## 📁 Files Changed This Session

```
M  src/layouts/Layout.astro      — og:url → muhammadadiputra.com
M  astro.config.mjs              — site URL + sitemap integration added
A  package.json / package-lock   — @astrojs/sitemap added
```

**Build at deploy:** ✅ 0 errors · 10 pages · sitemap-index.xml generated
