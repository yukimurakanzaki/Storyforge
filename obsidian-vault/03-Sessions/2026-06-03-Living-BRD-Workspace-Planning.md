# Session: Living BRD Workspace — Epic & Phase 1 Plans

**Date:** 2026-06-03 (WIB)
**Status:** Planning complete (no code shipped) — ready to execute
**Branch:** `feat/done-state-completion-ux` (planning docs only; execution branch `feat/living-brd-workspace` to be created off `main`)

---

## What this was

A pure planning/brainstorming session to revamp the `/analyze` page from a one-shot phase machine into a **Claude-style living BRD workspace**. Produced one epic + two executable implementation plans. **No application code was written** — only design/spec/plan documents.

## Completed Tasks ✅

- ✅ **Brainstormed the product model** — explored intent, reflected back, and locked the core design with the owner.
- ✅ **Wrote the Epic** — `obsidian-vault/01-Product/Epic-Living-BRD-Workspace.md`. Phase 1 = Stories 1–7, Phase 2 = Stories 8–11. Each story has As-a/I-want/so-that, acceptance criteria, executable subtasks, and DoD.
- ✅ **Added the Context Layer** (Story 2) after owner feedback — user profile/memory (industry, role, compliance, tech defaults, standing instructions, PRD template) read before analysis; constraint-conflict gaps; PRD-format preference.
- ✅ **Wrote the Backend plan** — `docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1.md` (Tasks 0–15), full TDD with real code grounded in the repo's patterns (`@/lib/anthropic`, `@/lib/sse`, vitest).
- ✅ **Wrote the Frontend plan** — `docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1-frontend.md` (Tasks F1–F10), components + `renderToStaticMarkup` tests matching the repo's test style.
- ✅ **Caught 2 schema-dependency bugs in self-review** — `brd_text NOT NULL` (no default) and the `status` CHECK constraint not allowing `'active'`. Both fixed in the plan (migration 010 widens the constraint; `brdText` threaded through `WorkspaceState`).
- ✅ **Baked in two owner requirements** — (1) NO sample/example BRD in the new flow; (2) contrast enforcement so no button/text disappears into its background — both as testable acceptance criteria.

## Key Decisions 🔑

- **One session = one living requirement** (long-lived, mutable, never "locked"). New requirement = new session, grouped by project, found via recents/search/starred.
- **Approach A** for state: mutable living-session record (`analysis_results` evolved) + single `/api/workspace` orchestrator + auto-compaction (session never maxes out — the headline benefit over raw Claude).
- **One structured model contract** (`ModelTurnResponse`) per turn; pure reducer applies it. 4 intents: new/expanded requirement, answer pending question, command, general chat.
- **Score is deterministic from gaps** (open high −15 / med −8 / low −3, floor 0) so it moves predictably as gaps close.
- **Deviations from epic (intentional):** PRD generated via the `command` intent (no separate route); PRD `version` inside the `prd` JSONB (no separate column); no token-streaming in v1 (status events + one `done`) — removes parser edge cases.
- **Context layer = Phase 1**, structured fields + free-text box; PRD default now + optional custom template.
- **Flowchart = Phase 2** (story 8), as a third artifact tab.
- **Scope boundary:** this epic ends at a groomable PRD (owner's steps 1–5 + persistence/#11). Downstream (designer/FSD/prototype) stays with existing skills.

## Blockers 🚧

- None technical. Planning is done and self-reviewed. Awaiting owner go-ahead to execute.

## Next Steps ➡️

1. Create execution branch: `git checkout main && git pull && git checkout -b feat/living-brd-workspace`; set `NEXT_PUBLIC_LIVING_WORKSPACE=true`.
2. Execute the **Backend plan** first (Tasks 0–15) — recommend subagent-driven-development, fresh agent per task. Apply migrations 010 + 011 via Supabase MCP.
3. Then execute the **Frontend plan** (Tasks F1–F10).
4. Verify the full happy path + the two owner requirements (no sample BRD, contrast).

## Files Changed (this session — docs only)

```
A  obsidian-vault/01-Product/Epic-Living-BRD-Workspace.md
A  docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1.md
A  docs/superpowers/plans/2026-06-03-living-brd-workspace-phase1-frontend.md
A  obsidian-vault/03-Sessions/2026-06-03-Living-BRD-Workspace-Planning.md
M  obsidian-vault/00-Index.md
```

No application source files were modified. Nothing committed (manual-commit rule).

**Last updated:** 2026-06-03 (WIB)
