# V2 Design Guardrails — PRD Refinement Output

> Reference for all frontend tasks in the PRD Refinement spec.
> Design north star: **Linear issue review** — dense, calm, inspectable, actionable.
> This is NOT a design system doc. It's a constraint checklist.

---

## Layout Order

Render sections in this exact order:

1. **Score + top metric** — readiness score badge + "X temuan baru yang belum ada di BRD"
2. **Ringkasan Temuan** — prioritized 5/5/5 summary
3. **Langkah berikutnya** — one contextual next-best-action sentence
4. **Copy actions** — "Salin pertanyaan" (primary), "Salin usulan requirement" (secondary)
5. **Journey Map** — simple vertical flowchart (hidden if null)
6. **Detailed Gap Cards** — collapsed by default, expandable

---

## Visual Rules

### Cards & Surfaces

- Border radius: `8–12px`
- Border: `1px solid` (hairline, neutral gray)
- No nested cards — flat hierarchy only
- No side-stripe severity borders
- No giant icon headers
- Compact internal spacing (`p-3` to `p-4`, not `p-6` or `p-8`)

### What NOT to Use

- ❌ Gradients
- ❌ Decorative blobs or background shapes
- ❌ Glassmorphism / backdrop-blur cards
- ❌ Oversized "AI-style" cards with large padding
- ❌ Colorful badge overload (max 1-2 subtle badges per card)
- ❌ Hero-sized text inside product panels
- ❌ Animated spectacle for loading states

### Color

- **One accent color** for: primary action buttons, focus rings, selected states
- **Semantic colors strictly for state:**
  - Red (`text-red-600`, `bg-red-50`) = missing / high-risk
  - Amber (`text-amber-600`, `bg-amber-50`) = needs clarification / medium
  - Green (`text-green-600`, `bg-green-50`) = ready / success / low-risk
- Source tags ("Sudah tertulis di BRD" / "Belum tertulis di BRD") = **neutral muted labels** (`text-gray-500 bg-gray-100`), not colorful pills

### Typography

- Font: system / Geist / Inter-style sans-serif
- Headings: clear, compact — `text-sm font-semibold` for section labels, `text-base font-semibold` for card titles
- Body copy: `text-sm`, max 1-2 sentences per field
- Labels: `text-xs text-gray-500`
- No hero-sized text (`text-2xl`+) inside the output panel

---

## Component-Specific Rules

### Gap Cards

- Compact and scannable — grouped rows, not 15 equal-weight full cards
- Full cards collapsed by default (show after summary)
- When expanded: 4 fields stacked vertically, tight spacing
- Individual copy buttons small and inline (icon-only or `text-xs`)

### Journey Map

- Simple and readable — clean nodes + arrows
- Not a decorative graph or heavy visualization
- Vertical layout, CSS flexbox/grid + SVG arrows
- Node states via border style and subtle background (not large colored blocks)

### Loading State

- Skeleton placeholders matching final layout shape
- Rotating status text below skeleton
- No raw JSON display
- No animated spectacle (no bouncing dots, pulsing orbs, etc.)
- Simple `animate-pulse` on skeleton blocks is sufficient

### Score Display

- Compact badge or pill with score number + label
- Color matches label: green/amber/red
- Component breakdown as small horizontal bars or inline text — not large pie charts

---

## UX Copy Rules

### Use These Terms

| Context | Copy |
|---------|------|
| Gap field 1 | "Yang belum jelas" |
| Gap field 2 | "Kenapa penting" |
| Gap field 3 | "Pertanyaan untuk tim" |
| Gap field 4 | "Usulan requirement" |
| Summary category 1 | "Risiko utama" |
| Source: in BRD | "Sudah tertulis di BRD" / "Berdasarkan BRD" |
| Source: AI-added | "Belum tertulis di BRD" |
| Section title | "Hasil Review BRD" or "Analisis BRD" |
| Next action label | "Langkah berikutnya" |

### Never Use in User-Facing Copy

- "Technical blindspot"
- "Edge case"
- "Critical gaps"
- "AI-generated insight"
- "Invalid"
- "Submit"
- "Foundation"
- Long explanations under every heading

### Tone

- Bahasa Indonesia, direct, non-technical, non-accusatory
- Calm, factual, helpful — like a senior colleague's review
- Not a grading system, not an AI report

---

## UX Choreography

### Section Label

Use **"Hasil Review BRD"** or **"Analisis BRD"** — never "Foundation".

### After Summary

Show one clear **"Langkah berikutnya"** sentence. Example:
> "Mulai dari 5 pertanyaan ini saat grooming. Setelah terjawab, jalankan analisis ulang untuk melihat apakah skor naik."

### Action Priority

| Priority | Action | Visual Weight |
|----------|--------|---------------|
| Primary | "Salin pertanyaan" | Prominent button (accent color) |
| Secondary | "Salin usulan requirement" | Visible but quieter (outline/ghost) |
| Tertiary | "Lanjut klarifikasi di chat" | Text link or subtle button |

### Chat Relationship

Above `RefinementChat`, add contextual copy:
> "Mau memperbaiki hasilnya? Jawab pertanyaan klarifikasi di bawah, lalu StoryForge akan memperbarui analisis."

### Toast Messages

- Post-copy: **"Pertanyaan disalin. Siap ditempel ke Slack atau dokumen grooming."**
- Post-copy requirements: **"Usulan requirement disalin. Siap ditempel ke PRD."**
- Not just "Disalin" — always add context on what to do next.

### No Gaps Found

> "Belum ada gap besar yang terdeteksi. BRD ini terlihat cukup siap, tapi tetap validasi asumsi utama dengan tim."

Honest, not absolute.

---

## Mobile / Meeting Mode

- Copy buttons reachable (consider sticky action bar)
- Summary readable without horizontal scroll
- Journey Map does not cramp on small screens (allow horizontal scroll or simplified view)
- Detailed Gap Cards collapsed by default
- Body text remains `text-sm`, no cramped `text-xs` on mobile

---

## Quick Reference: Do vs Don't

| ✅ Do | ❌ Don't |
|--------|----------|
| Hairline borders, compact spacing | Thick borders, generous padding |
| One accent color | Rainbow badges |
| Collapsed details by default | 15 equal-weight expanded cards |
| Skeleton + status text loading | Raw JSON or animated spectacle |
| Neutral muted source tags | Colorful pills for source |
| Dense, scannable rows | Large cards with lots of whitespace |
| Plain Bahasa Indonesia copy | English jargon, long explanations |
| Semantic color for state only | Decorative color everywhere |
| Simple flowchart nodes | Decorative graph visualization |
| System/Geist/Inter font | Custom display fonts |

---

*Referenced by tasks: 10.1–10.8, 11.1, 11.3*
*Requirements: 1.4, 2.1, 2.2, 3.1, 5.3, 8.1, 8.2, 9.1*
