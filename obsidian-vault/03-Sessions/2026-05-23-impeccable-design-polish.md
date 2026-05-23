# 2026-05-23: Impeccable Design Audit & Polish

**Session type:** UI design quality
**Branch:** main
**Duration:** ~2 hours

---

## What Happened

Ran a full impeccable design cycle on the analyze page (`app/(app)/analyze/page.tsx`).

### Phase 1: Critique (baseline)
- Score: **22/40** (Nielsen heuristics)
- Top issues: dark module in light layout, indigo accent pollution, side-stripe ban violation, 7-card locked section wall, missing teal brand consistency

### Phase 2: Top-3 Fixes (using Linear DESIGN.md as reference)
1. **Dark module in light layout** — fixed 3 layers: `bg-slate-900` wrapper → light, `STATUS_COLORS` in SectionCard.tsx → light tokens, all `text-slate-*` in FoundationSection.tsx → `text-gray-*`
2. **Indigo accent pollution** — replaced 5 instances across GapItem.tsx and QACards.tsx with teal equivalents
3. **Side-stripe ban + 7-card wall** — GapItem border-l removed, replaced with full border + tinted bg; LivingDocument collapsed 7 locked cards into 1 compact unlock preview block

### Phase 3: Layout pass (`impeccable layout`)
- Spacing rhythm improved across SessionSidebar, RefinementChat input bar, page.tsx input phase heading
- AnalyzingState restructured with proper vertical rhythm and accessible role/aria attributes
- `motion-reduce:animate-none` added to all animated elements

### Phase 4: Polish pass (`impeccable polish`)
- `motion-reduce:animate-none` on bounce dots, streaming cursor, finalizing spinner
- Modal focus trap fixed (missing `id` attribute on GapItem feedback modal dialog)
- "(Plan 5)" dev note removed from LivingDocument

### Phase 5: Second critique
- Score: **24/40** (+2)
- Remaining P2 issues identified and fixed this session (see below)

### Phase 6: P2 fixes
- **Refine failure deletes user message** — all 3 error paths in `callRefineAPI` (`page.tsx:388,448,454`) now keep user message and append an assistant error bubble instead of slicing off the last message
- **Enter-to-send hint disappears once typing** — moved keyboard shortcut hint from placeholder to a permanent `text-xs text-gray-400` line below the textarea in RefinementChat.tsx; placeholder simplified

---

## Files Changed

| File | Change |
|---|---|
| `app/(app)/analyze/page.tsx` | Dark bg removed, AnalyzingState restructured, 3 error paths fixed |
| `components/analyze/BRDInput.tsx` | Focus ring indigo → teal |
| `components/analyze/SectionCard.tsx` | STATUS_COLORS → light tokens |
| `components/analyze/FoundationSection.tsx` | All dark color tokens → light |
| `components/analyze/LivingDocument.tsx` | 7 locked cards collapsed, dev note removed |
| `components/analyze/GapItem.tsx` | Side-stripe removed, teal focus ring, modal id fix, confidence badges updated |
| `components/analyze/QACards.tsx` | Indigo → teal |
| `components/analyze/RefinementChat.tsx` | Layout spacing, motion-reduce, persistent Enter hint |
| `components/analyze/SessionSidebar.tsx` | Layout spacing |

---

## P3 Issues (not fixed — low priority)

- `page.tsx:79` — streaming `<pre>` reads as debug output; needs UX label or removal
- `components/analyze/CollapsibleSection.tsx:30` — orphaned `dark:hover:bg-slate-700` with no effect in light mode

---

## Next Steps

1. Commit this branch to main (or already on main — no new branch created)
2. Consider fixing the 2 P3 issues above if doing another polish pass
3. Domain registration + email setup (still pending from previous session)
4. Run Supabase migrations: `005_output_trust_layer.sql` + `008_profile_roles.sql`
