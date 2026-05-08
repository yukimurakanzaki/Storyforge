# Living Document Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current phase machine with a living document workspace — PM creates a project with context, pastes a BRD, Foundation section generates automatically, and the session persists in Supabase so the PM can return days later and see their readiness score + open gaps.

**Architecture:** Project layer (new `projects` table) sits above Session (`analysis_results`). Session renders as a living document with 9 collapsible section cards — only Foundation generates in this plan; sections 2–9 show empty cards with disabled Generate buttons. Phase machine (`input → analyzing → refining → finalizing → done`) is removed and replaced with the living document shell.

**Tech Stack:** Next.js 14 App Router, Supabase (postgres + auth), Tailwind CSS, TypeScript, Playwright (e2e)

**Spec:** `docs/superpowers/specs/2026-05-08-storyforge-living-document-design.md`

---

## File Map

### New files
- `supabase/migrations/006_projects_and_sections.sql` — projects table + analysis_results new columns
- `app/api/projects/route.ts` — GET (list), POST (create)
- `app/api/projects/[id]/context/route.ts` — PATCH project context
- `app/api/projects/[id]/design-md/route.ts` — PATCH design.md
- `lib/projects.ts` — project CRUD helpers
- `components/analyze/ProjectSelector.tsx` — pick existing project or create new
- `components/analyze/ProjectContextForm.tsx` — business + technical profile form
- `components/analyze/LivingDocument.tsx` — document shell, renders all 9 section cards
- `components/analyze/SectionCard.tsx` — reusable collapsible card (title, status badge, generate btn, copy btn)
- `components/analyze/FoundationSection.tsx` — Foundation section content (gap list, readiness, Q&A log)

### Modified files
- `types/index.ts` — add Project, ProjectContext, SectionState, LiveSession types
- `app/api/save-session/route.ts` — add project_id, sections, section_states, session_state columns
- `app/(app)/analyze/page.tsx` — replace phase machine with ProjectSelector → BRD input → LivingDocument
- `app/(app)/analyze/[id]/page.tsx` — re-open view: open to Foundation section showing readiness + gaps
- `components/analyze/SessionSidebar.tsx` — add readiness score badge per session item

---

## Task 1: Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add types**

Open `types/index.ts` and append:

```typescript
export type ProjectContext = {
  business: {
    description: string
    target_users: string[]
    domain: string
    compliance: string[]
    naming_conventions: Record<string, string>
    past_decisions: string[]
  }
  technical: {
    frontend: string
    backend: string
    existing_systems: string[]
    integrations: string[]
    constraints: string[]
    tech_debt: string[]
  }
}

export type Project = {
  id: string
  user_id: string
  name: string
  context: ProjectContext
  design_md: string | null
  design_md_source: 'uploaded' | 'generated' | null
  created_at: string
}

export type SectionStatus = 'empty' | 'generating' | 'done' | 'stale'

export type SectionName =
  | 'foundation'
  | 'roles'
  | 'flow'
  | 'engineer'
  | 'designer'
  | 'qa'
  | 'templates'
  | 'stakeholder'

export type SectionStates = Record<SectionName, SectionStatus>

export type SectionBlobs = Partial<Record<SectionName, unknown>>

export type SessionState = 'refining' | 'ready' | 'done'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to new types.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Project, SectionState, SessionState types"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/006_projects_and_sections.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/006_projects_and_sections.sql

-- Projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  context jsonb not null default '{
    "business": {
      "description": "",
      "target_users": [],
      "domain": "",
      "compliance": [],
      "naming_conventions": {},
      "past_decisions": []
    },
    "technical": {
      "frontend": "",
      "backend": "",
      "existing_systems": [],
      "integrations": [],
      "constraints": [],
      "tech_debt": []
    }
  }'::jsonb,
  design_md text,
  design_md_source text check (design_md_source in ('uploaded', 'generated')),
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add columns to analysis_results
alter table analysis_results
  add column if not exists project_id uuid references projects,
  add column if not exists sections jsonb not null default '{}'::jsonb,
  add column if not exists section_states jsonb not null default '{
    "foundation": "empty",
    "roles": "empty",
    "flow": "empty",
    "engineer": "empty",
    "designer": "empty",
    "qa": "empty",
    "templates": "empty",
    "stakeholder": "empty"
  }'::jsonb,
  add column if not exists requirement_version integer not null default 1,
  add column if not exists session_state text not null default 'refining'
    check (session_state in ('refining', 'ready', 'done'));
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: migration applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_projects_and_sections.sql
git commit -m "feat: add projects table and section columns to analysis_results"
```

---

## Task 3: Project API Routes

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/context/route.ts`
- Create: `app/api/projects/[id]/design-md/route.ts`

- [ ] **Step 1: Write GET/POST /api/projects**

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
```

- [ ] **Step 2: Write PATCH /api/projects/[id]/context**

```typescript
// app/api/projects/[id]/context/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const context = await req.json()

  const { data, error } = await supabase
    .from('projects')
    .update({ context })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
```

- [ ] **Step 3: Write PATCH /api/projects/[id]/design-md**

```typescript
// app/api/projects/[id]/design-md/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { design_md, source } = await req.json()

  const { data, error } = await supabase
    .from('projects')
    .update({
      design_md,
      design_md_source: source ?? 'uploaded'
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/
git commit -m "feat: project API routes (list, create, update context, update design-md)"
```

---

## Task 4: lib/projects.ts

**Files:**
- Create: `lib/projects.ts`

- [ ] **Step 1: Write client-side project helpers**

```typescript
// lib/projects.ts
import { Project, ProjectContext } from '@/types'

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error('Failed to fetch projects')
  const { projects } = await res.json()
  return projects
}

export async function createProject(name: string): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  if (!res.ok) throw new Error('Failed to create project')
  const { project } = await res.json()
  return project
}

export async function updateProjectContext(
  projectId: string,
  context: ProjectContext
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/context`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context)
  })
  if (!res.ok) throw new Error('Failed to update project context')
  const { project } = await res.json()
  return project
}

export async function updateProjectDesignMd(
  projectId: string,
  design_md: string,
  source: 'uploaded' | 'generated' = 'uploaded'
): Promise<Project> {
  const res = await fetch(`/api/projects/${projectId}/design-md`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_md, source })
  })
  if (!res.ok) throw new Error('Failed to update design.md')
  const { project } = await res.json()
  return project
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/projects.ts
git commit -m "feat: project client helpers"
```

---

## Task 5: SectionCard Component

**Files:**
- Create: `components/analyze/SectionCard.tsx`

- [ ] **Step 1: Write SectionCard**

```typescript
// components/analyze/SectionCard.tsx
'use client'
import { useState } from 'react'
import { SectionStatus } from '@/types'

type Props = {
  title: string
  icon: string
  badges: string[]
  status: SectionStatus
  onGenerate?: () => void
  onCopy?: () => void
  children?: React.ReactNode
  disabled?: boolean
}

const STATUS_STYLES: Record<SectionStatus, string> = {
  empty: 'bg-slate-800 text-slate-500',
  generating: 'bg-amber-900/40 text-amber-400',
  done: 'bg-teal-900/40 text-teal-400',
  stale: 'bg-orange-900/40 text-orange-400',
}

const STATUS_LABELS: Record<SectionStatus, string> = {
  empty: 'Belum dibuat',
  generating: 'Memproses...',
  done: 'Selesai',
  stale: 'Perlu diperbarui',
}

export function SectionCard({
  title, icon, badges, status, onGenerate, onCopy, children, disabled
}: Props) {
  const [open, setOpen] = useState(status === 'done' || status === 'stale')

  return (
    <div className="border border-slate-700 rounded-xl bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-expanded={open}
        >
          <span className="text-lg flex-shrink-0">{icon}</span>
          <span className="font-semibold text-slate-100 text-sm truncate">{title}</span>
          <div className="flex gap-1 flex-shrink-0">
            {badges.map(b => (
              <span key={b} className="text-xs bg-slate-800 text-slate-400 rounded px-2 py-0.5">
                {b}
              </span>
            ))}
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs rounded-full px-2 py-0.5 ${STATUS_STYLES[status]}`}>
            {STATUS_LABELS[status]}
          </span>

          {status === 'done' && onCopy && (
            <button
              onClick={onCopy}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Salin
            </button>
          )}

          {(status === 'empty' || status === 'stale') && onGenerate && (
            <button
              onClick={onGenerate}
              disabled={disabled}
              className="text-xs bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1 rounded transition-colors"
            >
              {status === 'stale' ? 'Perbarui' : 'Buat'}
            </button>
          )}

          {status === 'generating' && (
            <span className="text-xs text-amber-400 animate-pulse">Memproses...</span>
          )}
        </div>
      </div>

      {/* Body */}
      {open && children && (
        <div className="border-t border-slate-800 px-4 py-4">
          {children}
        </div>
      )}

      {open && !children && status === 'empty' && (
        <div className="border-t border-slate-800 px-4 py-8 text-center text-slate-600 text-sm">
          Klik &ldquo;Buat&rdquo; untuk menghasilkan bagian ini
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/SectionCard.tsx
git commit -m "feat: SectionCard component with status badge and generate/copy actions"
```

---

## Task 6: FoundationSection Component

**Files:**
- Create: `components/analyze/FoundationSection.tsx`

- [ ] **Step 1: Write FoundationSection**

This renders the content of the Foundation section — gap list, readiness score, Q&A log, assumptions, out-of-scope items.

```typescript
// components/analyze/FoundationSection.tsx
'use client'
import { useState } from 'react'

type Gap = {
  category: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

type QAEntry = {
  question: string
  answer: string
  round: number
}

export type FoundationData = {
  brd_summary: string
  gap_list: Gap[]
  readiness_score: number
  readiness_label: string
  qa_log: QAEntry[]
  assumptions: string[]
  out_of_scope: string[]
}

type Props = {
  data: FoundationData
}

const SEVERITY_COLORS = {
  high: 'text-red-400 bg-red-900/30 border-red-800',
  medium: 'text-amber-400 bg-amber-900/30 border-amber-800',
  low: 'text-slate-400 bg-slate-800 border-slate-700',
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? 'text-teal-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

export function FoundationSection({ data }: Props) {
  const [qaOpen, setQaOpen] = useState(false)

  return (
    <div className="space-y-5">
      {/* Readiness Score */}
      <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
        <div className={`text-4xl font-bold ${SCORE_COLOR(data.readiness_score)}`}>
          {data.readiness_score}
        </div>
        <div>
          <div className="text-slate-100 font-semibold">{data.readiness_label}</div>
          <div className="text-slate-500 text-xs">Readiness Score / 100</div>
        </div>
      </div>

      {/* BRD Summary */}
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Ringkasan BRD</div>
        <p className="text-slate-300 text-sm leading-relaxed">{data.brd_summary}</p>
      </div>

      {/* Gap List */}
      {data.gap_list.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Gap ({data.gap_list.length})
          </div>
          <div className="space-y-2">
            {data.gap_list.map((gap, i) => (
              <div key={i} className={`border rounded-lg px-3 py-2 text-sm ${SEVERITY_COLORS[gap.severity]}`}>
                <span className="font-medium">[{gap.category}]</span> {gap.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assumptions */}
      {data.assumptions.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Asumsi AI ({data.assumptions.length})
          </div>
          <ul className="space-y-1">
            {data.assumptions.map((a, i) => (
              <li key={i} className="text-slate-400 text-sm flex gap-2">
                <span className="text-amber-500 flex-shrink-0">⚠</span> {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Out of Scope */}
      {data.out_of_scope.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Di Luar Scope ({data.out_of_scope.length})
          </div>
          <ul className="space-y-1">
            {data.out_of_scope.map((item, i) => (
              <li key={i} className="text-slate-500 text-sm flex gap-2">
                <span className="flex-shrink-0">—</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Q&A Log */}
      {data.qa_log.length > 0 && (
        <div>
          <button
            onClick={() => setQaOpen(o => !o)}
            className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1 hover:text-slate-300 transition-colors"
          >
            Log Q&A ({data.qa_log.length} pertanyaan) {qaOpen ? '▲' : '▼'}
          </button>
          {qaOpen && (
            <div className="mt-2 space-y-3">
              {data.qa_log.map((entry, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Ronde {entry.round}</div>
                  <div className="text-slate-300 text-sm font-medium mb-1">{entry.question}</div>
                  <div className="text-slate-400 text-sm">{entry.answer}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/FoundationSection.tsx
git commit -m "feat: FoundationSection component"
```

---

## Task 7: LivingDocument Shell

**Files:**
- Create: `components/analyze/LivingDocument.tsx`

- [ ] **Step 1: Write LivingDocument**

Renders all 9 section cards. Only Foundation shows content in this plan; sections 2–8 are empty cards with disabled Generate buttons (enabled in Plan 4).

```typescript
// components/analyze/LivingDocument.tsx
'use client'
import { SectionCard } from './SectionCard'
import { FoundationSection, FoundationData } from './FoundationSection'
import { SectionStates, SessionState } from '@/types'

type Props = {
  foundationData: FoundationData | null
  sectionStates: SectionStates
  sessionState: SessionState
  onCopySection: (section: string, content: string) => void
}

const SECTION_META = [
  { key: 'roles', icon: '👤', title: 'Roles & Access', badges: ['PM', 'Dev', 'Designer'] },
  { key: 'flow', icon: '🗺️', title: 'Flow & Logic', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'engineer', icon: '⚙️', title: 'Engineer Section', badges: ['Dev'] },
  { key: 'designer', icon: '🎨', title: 'Designer Section', badges: ['Designer'] },
  { key: 'qa', icon: '🧪', title: 'QA Section', badges: ['QA'] },
  { key: 'templates', icon: '📎', title: 'Template Artifacts', badges: ['Dev', 'Designer', 'QA'] },
  { key: 'stakeholder', icon: '📊', title: 'Stakeholder View', badges: ['Business'] },
] as const

export function LivingDocument({ foundationData, sectionStates, sessionState, onCopySection }: Props) {
  const isReady = sessionState === 'ready' || sessionState === 'done'

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="space-y-3">
      {/* Section 1: Foundation — always visible, always first */}
      <SectionCard
        title="Foundation"
        icon="📌"
        badges={['PM', 'Semua']}
        status={sectionStates.foundation}
        onCopy={foundationData ? () => onCopySection('foundation', JSON.stringify(foundationData, null, 2)) : undefined}
      >
        {foundationData && <FoundationSection data={foundationData} />}
      </SectionCard>

      {/* Sections 2–8: disabled until session is ready */}
      {SECTION_META.map(({ key, icon, title, badges }) => (
        <SectionCard
          key={key}
          title={title}
          icon={icon}
          badges={badges as string[]}
          status={sectionStates[key as keyof SectionStates]}
          disabled={!isReady}
          onGenerate={isReady ? () => {} : undefined}
        />
      ))}

      {/* Section 9: Export — always last, no generate button (Plan 5) */}
      <SectionCard
        title="Output & Export"
        icon="🚀"
        badges={['Semua']}
        status="empty"
      >
        <p className="text-slate-500 text-sm">Export tersedia setelah semua section selesai. (Plan 5)</p>
      </SectionCard>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/LivingDocument.tsx
git commit -m "feat: LivingDocument shell with 9 section cards"
```

---

## Task 8: ProjectContextForm Component

**Files:**
- Create: `components/analyze/ProjectContextForm.tsx`

- [ ] **Step 1: Write ProjectContextForm**

Guided form for business + technical profile. Uses textarea per field, no blank canvas.

```typescript
// components/analyze/ProjectContextForm.tsx
'use client'
import { useState } from 'react'
import { ProjectContext } from '@/types'

const DEFAULT_CONTEXT: ProjectContext = {
  business: {
    description: '',
    target_users: [],
    domain: '',
    compliance: [],
    naming_conventions: {},
    past_decisions: [],
  },
  technical: {
    frontend: '',
    backend: '',
    existing_systems: [],
    integrations: [],
    constraints: [],
    tech_debt: [],
  }
}

type Props = {
  initial?: ProjectContext
  onSave: (context: ProjectContext) => Promise<void>
  onCancel: () => void
}

export function ProjectContextForm({ initial, onSave, onCancel }: Props) {
  const [ctx, setCtx] = useState<ProjectContext>(initial ?? DEFAULT_CONTEXT)
  const [saving, setSaving] = useState(false)

  const setB = (key: keyof ProjectContext['business'], value: string) =>
    setCtx(c => ({ ...c, business: { ...c.business, [key]: value } }))

  const setT = (key: keyof ProjectContext['technical'], value: string) =>
    setCtx(c => ({ ...c, technical: { ...c.technical, [key]: value } }))

  // Convert textarea newline-separated lists to arrays before saving
  const handleSave = async () => {
    setSaving(true)
    const parsed: ProjectContext = {
      business: {
        ...ctx.business,
        target_users: toArray(ctx.business.target_users),
        compliance: toArray(ctx.business.compliance),
        past_decisions: toArray(ctx.business.past_decisions),
      },
      technical: {
        ...ctx.technical,
        existing_systems: toArray(ctx.technical.existing_systems),
        integrations: toArray(ctx.technical.integrations),
        constraints: toArray(ctx.technical.constraints),
        tech_debt: toArray(ctx.technical.tech_debt),
      }
    }
    await onSave(parsed)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-200 font-semibold mb-4">Profil Bisnis</h3>
        <div className="space-y-4">
          <Field label="Deskripsi produk / perusahaan" hint="Apa yang dibangun, untuk siapa">
            <textarea
              className="input-base"
              rows={2}
              value={ctx.business.description}
              onChange={e => setB('description', e.target.value)}
              placeholder="Contoh: Platform analisis BRD untuk Product Manager Indonesia..."
            />
          </Field>
          <Field label="Target users" hint="Satu per baris — role nyata yang ada di sistem">
            <textarea
              className="input-base"
              rows={3}
              value={toLines(ctx.business.target_users)}
              onChange={e => setB('target_users', e.target.value as unknown as string[])}
              placeholder="Product Manager&#10;Finance Approver&#10;System Admin"
            />
          </Field>
          <Field label="Domain bisnis">
            <input
              className="input-base"
              value={ctx.business.domain}
              onChange={e => setB('domain', e.target.value)}
              placeholder="Contoh: B2B SaaS, Fintech, E-commerce"
            />
          </Field>
          <Field label="Aturan compliance / regulasi" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.business.compliance)}
              onChange={e => setB('compliance', e.target.value as unknown as string[])}
              placeholder="Data harus onshore Indonesia&#10;OJK POJK 77/2016"
            />
          </Field>
          <Field label="Keputusan masa lalu yang relevan" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.business.past_decisions)}
              onChange={e => setB('past_decisions', e.target.value as unknown as string[])}
              placeholder="Modul billing lama sudah sunset Q1 2026&#10;Tidak menggunakan microservices"
            />
          </Field>
        </div>
      </div>

      <div>
        <h3 className="text-slate-200 font-semibold mb-4">Profil Teknis</h3>
        <div className="space-y-4">
          <Field label="Frontend stack">
            <input
              className="input-base"
              value={ctx.technical.frontend}
              onChange={e => setT('frontend', e.target.value)}
              placeholder="Next.js 14, Tailwind CSS, TypeScript"
            />
          </Field>
          <Field label="Backend stack">
            <input
              className="input-base"
              value={ctx.technical.backend}
              onChange={e => setT('backend', e.target.value)}
              placeholder="Supabase, QStash, Vercel Edge Functions"
            />
          </Field>
          <Field label="Sistem yang sudah ada" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={3}
              value={toLines(ctx.technical.existing_systems)}
              onChange={e => setT('existing_systems', e.target.value as unknown as string[])}
              placeholder="Auth menggunakan Supabase magic link&#10;Pembayaran: Xendit"
            />
          </Field>
          <Field label="Integrasi pihak ketiga" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.technical.integrations)}
              onChange={e => setT('integrations', e.target.value as unknown as string[])}
              placeholder="Xendit payment gateway&#10;Resend email"
            />
          </Field>
          <Field label="Constraint arsitektur" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.technical.constraints)}
              onChange={e => setT('constraints', e.target.value as unknown as string[])}
              placeholder="Tidak pakai microservices&#10;Semua data onshore"
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 text-white rounded-lg transition-colors"
        >
          {saving ? 'Menyimpan...' : 'Simpan Context'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">
        {label}
        {hint && <span className="text-slate-500 text-xs ml-2">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

function toLines(val: string[] | string): string {
  return Array.isArray(val) ? val.join('\n') : val
}

function toArray(val: string[] | string): string[] {
  if (Array.isArray(val)) return val.filter(Boolean)
  return val.split('\n').map(s => s.trim()).filter(Boolean)
}
```

Then add the shared input style to `app/globals.css`:

```css
/* add to globals.css */
.input-base {
  @apply w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-600 resize-none;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/ProjectContextForm.tsx app/globals.css
git commit -m "feat: ProjectContextForm — guided business + technical profile"
```

---

## Task 9: ProjectSelector Component

**Files:**
- Create: `components/analyze/ProjectSelector.tsx`

- [ ] **Step 1: Write ProjectSelector**

Shows existing projects as cards. "New project" creates one inline. PM must select a project before starting a session.

```typescript
// components/analyze/ProjectSelector.tsx
'use client'
import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { fetchProjects, createProject } from '@/lib/projects'
import { ProjectContextForm } from './ProjectContextForm'
import { updateProjectContext } from '@/lib/projects'

type Props = {
  onSelect: (project: Project) => void
}

export function ProjectSelector({ onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showContextForm, setShowContextForm] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const project = await createProject(newName.trim())
    setProjects(p => [project, ...p])
    setNewName('')
    setCreating(false)
    setShowContextForm(project)
  }

  const handleContextSaved = async (project: Project, context: Parameters<typeof updateProjectContext>[1]) => {
    const updated = await updateProjectContext(project.id, context)
    setProjects(ps => ps.map(p => p.id === updated.id ? updated : p))
    setShowContextForm(null)
    onSelect(updated)
  }

  if (showContextForm) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
        <h2 className="text-slate-100 font-semibold text-lg mb-1">Setup Project Context</h2>
        <p className="text-slate-500 text-sm mb-6">
          Context ini digunakan AI di setiap sesi untuk memberikan analisis yang lebih akurat.
          Bisa diperbarui kapan saja.
        </p>
        <ProjectContextForm
          onSave={ctx => handleContextSaved(showContextForm, ctx)}
          onCancel={() => { setShowContextForm(null); onSelect(showContextForm) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-100 font-semibold">Pilih Project</h2>
        <button
          onClick={() => setCreating(true)}
          className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
        >
          + Project baru
        </button>
      </div>

      {creating && (
        <div className="flex gap-2">
          <input
            autoFocus
            className="input-base flex-1"
            placeholder="Nama project, misal: Invoice Module"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm rounded-lg"
          >
            Buat
          </button>
          <button
            onClick={() => { setCreating(false); setNewName('') }}
            className="px-3 py-2 text-slate-500 hover:text-slate-300 text-sm"
          >
            Batal
          </button>
        </div>
      )}

      {loading && <p className="text-slate-500 text-sm">Memuat project...</p>}

      {!loading && projects.length === 0 && !creating && (
        <p className="text-slate-500 text-sm">Belum ada project. Buat project baru untuk mulai.</p>
      )}

      <div className="grid gap-2">
        {projects.map(project => (
          <button
            key={project.id}
            onClick={() => onSelect(project)}
            className="text-left border border-slate-700 hover:border-teal-700 bg-slate-900 hover:bg-slate-800 rounded-xl p-4 transition-colors group"
          >
            <div className="text-slate-100 font-medium group-hover:text-teal-300 transition-colors">
              {project.name}
            </div>
            <div className="text-slate-500 text-xs mt-1">
              {project.context.business.domain || 'Context belum diisi'}
              {project.design_md ? ' · design.md ✓' : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/analyze/ProjectSelector.tsx
git commit -m "feat: ProjectSelector — pick or create project before starting session"
```

---

## Task 10: Update /api/save-session

**Files:**
- Modify: `app/api/save-session/route.ts`

- [ ] **Step 1: Read current file**

Read `app/api/save-session/route.ts` to understand current shape before modifying.

- [ ] **Step 2: Add new fields to phase-1 upsert**

In the phase-1 upsert block, add these fields alongside existing ones:

```typescript
// Add to the insert/upsert object in phase-1 (initial save):
project_id: body.projectId ?? null,
session_state: body.sessionState ?? 'refining',
sections: body.sections ?? {},
section_states: body.sectionStates ?? {
  foundation: 'empty',
  roles: 'empty',
  flow: 'empty',
  engineer: 'empty',
  designer: 'empty',
  qa: 'empty',
  templates: 'empty',
  stakeholder: 'empty',
},
```

- [ ] **Step 3: Add fields to phase-2 update**

In the phase-2 update block, add:

```typescript
// Add to the update object in phase-2 (update after requirements generated):
session_state: body.sessionState ?? 'done',
sections: body.sections ?? {},
section_states: body.sectionStates ?? {},
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/save-session/route.ts
git commit -m "feat: save-session accepts project_id, sections, section_states, session_state"
```

---

## Task 11: Analyze Page Refactor

**Files:**
- Modify: `app/(app)/analyze/page.tsx`

This is the biggest change. The current page is a phase machine with many states. We replace the top-level orchestration with: ProjectSelector → BRD input → LivingDocument.

The existing `/api/analyze` and `/api/refine` routes are unchanged. The Q&A flow (QACards, RefinementChat) is preserved inside the Foundation section flow.

- [ ] **Step 1: Read current page**

Read `app/(app)/analyze/page.tsx` in full to understand current state machine before modifying.

- [ ] **Step 2: Replace phase machine with living document orchestration**

Replace the page with the following structure. Keep all existing API call logic (`callAnalyzeAPI`, `callRefineAPI`, `handleSubmitQA`) — only replace the top-level state machine and render logic.

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project, SectionStates, SessionState, FoundationData } from '@/types'  // FoundationData imported from FoundationSection
import { ProjectSelector } from '@/components/analyze/ProjectSelector'
import { BRDInput } from '@/components/analyze/BRDInput'
import { LivingDocument } from '@/components/analyze/LivingDocument'
import { QACards } from '@/components/analyze/QACards'
import { RefinementChat } from '@/components/analyze/RefinementChat'

type Phase = 'select-project' | 'input' | 'analyzing' | 'refining' | 'document'

const DEFAULT_SECTION_STATES: SectionStates = {
  foundation: 'empty',
  roles: 'empty',
  flow: 'empty',
  engineer: 'empty',
  designer: 'empty',
  qa: 'empty',
  templates: 'empty',
  stakeholder: 'empty',
}

export default function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>('select-project')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [brdText, setBrdText] = useState('')
  const [foundationData, setFoundationData] = useState<FoundationData | null>(null)
  const [sectionStates, setSectionStates] = useState<SectionStates>(DEFAULT_SECTION_STATES)
  const [sessionState, setSessionState] = useState<SessionState>('refining')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [qaAnswers, setQaAnswers] = useState<Array<{ question: string; answer: string; isOutOfScope: boolean }>>([])
  const [clarificationQuestions, setClarificationQuestions] = useState<string[]>([])

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setPhase('input')
  }

  const handleAnalyze = useCallback(async () => {
    if (!brdText.trim()) return
    setPhase('analyzing')

    // Build system context from project
    const projectContext = selectedProject
      ? `\n\nProject Context:\n${JSON.stringify(selectedProject.context, null, 2)}`
      : ''

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brd: brdText + projectContext }),
    })
    const data = await res.json()

    const foundation: FoundationData = {
      brd_summary: data.brdSummary ?? '',
      gap_list: data.gapList ?? [],
      readiness_score: data.readinessScore ?? 0,
      readiness_label: data.readinessLabel ?? '',
      qa_log: [],
      assumptions: data.assumptions ?? [],
      out_of_scope: data.outOfScope ?? [],
    }

    setFoundationData(foundation)
    setClarificationQuestions(data.clarificationQuestions ?? [])
    setSectionStates(s => ({ ...s, foundation: 'done' }))

    const newSessionState: SessionState = (data.readinessScore ?? 0) >= 80 ? 'ready' : 'refining'
    setSessionState(newSessionState)

    // Save to Supabase if authed
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const saveRes = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 1,
          projectId: selectedProject?.id ?? null,
          brd: brdText,
          gapList: data.gapList,
          clarificationQuestions: data.clarificationQuestions,
          readinessScore: data.readinessScore,
          readinessLabel: data.readinessLabel,
          sessionState: newSessionState,
          sections: { foundation },
          sectionStates: { ...DEFAULT_SECTION_STATES, foundation: 'done' },
        }),
      })
      const saveData = await saveRes.json()
      if (saveData.id) setAnalysisId(saveData.id)
    }

    setPhase('refining')
  }, [brdText, selectedProject])

  const handleSubmitQA = useCallback(async () => {
    if (!foundationData) return

    const answeredQA = qaAnswers.map(a => ({ ...a }))
    const newQaLog = [
      ...foundationData.qa_log,
      ...answeredQA
        .filter(a => a.answer.trim())
        .map(a => ({ question: a.question, answer: a.answer, round: foundationData.qa_log.length + 1 }))
    ]

    const res = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brd: brdText,
        messages,
        qaAnswers: answeredQA,
        projectContext: selectedProject?.context ?? null,
      }),
    })
    const data = await res.json()

    const updated: FoundationData = {
      brd_summary: foundationData.brd_summary,
      gap_list: data.analysis?.gapList ?? foundationData.gap_list,
      readiness_score: data.analysis?.readinessScore ?? foundationData.readiness_score,
      readiness_label: data.analysis?.readinessLabel ?? foundationData.readiness_label,
      qa_log: newQaLog,
      assumptions: data.analysis?.assumptions ?? foundationData.assumptions,
      out_of_scope: data.analysis?.outOfScope ?? foundationData.out_of_scope,
    }

    setFoundationData(updated)
    setClarificationQuestions(data.analysis?.clarificationQuestions ?? [])
    setMessages(m => [...m, { role: 'assistant', content: data.message }])
    setQaAnswers([])

    const newScore = updated.readiness_score
    const newSessionState: SessionState = newScore >= 80 ? 'ready' : 'refining'
    setSessionState(newSessionState)
    setSectionStates(s => ({ ...s, foundation: 'done' }))
  }, [foundationData, qaAnswers, messages, brdText, selectedProject])

  const handleCopySection = (_section: string, content: string) => {
    navigator.clipboard.writeText(content)
  }

  // ---- Render ----

  if (phase === 'select-project') {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <ProjectSelector onSelect={handleProjectSelect} />
      </main>
    )
  }

  if (phase === 'input') {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => setPhase('select-project')} className="text-slate-500 hover:text-slate-300 text-sm">
            ← {selectedProject?.name}
          </button>
        </div>
        <BRDInput
          value={brdText}
          onChange={setBrdText}
          onSubmit={handleAnalyze}
          isLoading={false}
        />
      </main>
    )
  }

  if (phase === 'analyzing') {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-400 animate-pulse">Menganalisis BRD...</p>
      </main>
    )
  }

  // 'refining' and 'document' phases
  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Project breadcrumb */}
      <div className="text-sm text-slate-500">
        {selectedProject?.name} → Sesi baru
      </div>

      {/* Q&A panel (shown while refining) */}
      {sessionState === 'refining' && clarificationQuestions.length > 0 && (
        <div className="border border-slate-700 rounded-xl p-4 bg-slate-900/50">
          <h3 className="text-slate-200 font-medium mb-3 text-sm">
            Pertanyaan Klarifikasi
          </h3>
          <QACards
            questions={clarificationQuestions}
            answers={qaAnswers}
            onAnswersChange={setQaAnswers}
            onSubmit={handleSubmitQA}
          />
        </div>
      )}

      {/* Ready banner */}
      {sessionState === 'ready' && (
        <div className="bg-teal-900/30 border border-teal-700 rounded-xl p-4 text-teal-300 text-sm">
          ✓ Readiness score ≥ 80 — Requirement siap. Buat section di bawah.
        </div>
      )}

      {/* Living document */}
      {foundationData && (
        <LivingDocument
          foundationData={foundationData}
          sectionStates={sectionStates}
          sessionState={sessionState}
          onCopySection={handleCopySection}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors (fix any type mismatches from existing code — keep existing QACards/RefinementChat prop interfaces intact).

- [ ] **Step 4: Commit**

```bash
git add app/(app)/analyze/page.tsx
git commit -m "feat: replace phase machine with living document workspace"
```

---

## Task 12: Re-Open Behaviour — [id] Page

**Files:**
- Modify: `app/(app)/analyze/[id]/page.tsx`

When a PM returns to an existing session, the page shows the Foundation section with readiness score + gap list — not the BRD input.

- [ ] **Step 1: Read current [id] page**

Read `app/(app)/analyze/[id]/page.tsx` to understand what it currently renders.

- [ ] **Step 2: Update to show Foundation section on re-open**

```typescript
// app/(app)/analyze/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SectionCard } from '@/components/analyze/SectionCard'
import { FoundationSection } from '@/components/analyze/FoundationSection'

export default async function SessionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('analysis_results')
    .select('*, projects(name)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!session) notFound()

  // Foundation data — may be in new sections.foundation or legacy fields
  const foundationData = session.sections?.foundation ?? {
    brd_summary: session.brd_text?.slice(0, 500) ?? '',
    gap_list: session.gap_list ?? [],
    readiness_score: session.readiness_score ?? 0,
    readiness_label: session.readiness_label ?? '',
    qa_log: [],
    assumptions: [],
    out_of_scope: [],
  }

  const sectionStates = session.section_states ?? { foundation: 'done' }
  const score = foundationData.readiness_score ?? 0
  const scoreColor = score >= 80 ? 'text-teal-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-500 text-xs mb-1">
            {(session as any).projects?.name ?? 'Tanpa Project'}
          </div>
          <h1 className="text-slate-100 font-semibold">
            {session.brd_text?.slice(0, 60)}...
          </h1>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}</div>
          <div className="text-slate-500 text-xs">Readiness Score</div>
        </div>
      </div>

      {/* Foundation section — always open on re-entry */}
      <SectionCard
        title="Foundation"
        icon="📌"
        badges={['PM', 'Semua']}
        status={sectionStates.foundation ?? 'done'}
      >
        <FoundationSection data={foundationData} />
      </SectionCard>

      {/* Continue button — back to live analyze page is not possible server-side;
          show a note for now. Full resume flow is Plan 4. */}
      <div className="text-center pt-4">
        <p className="text-slate-500 text-sm">
          Untuk melanjutkan sesi ini, gunakan halaman Analyze dan lanjutkan dari Q&A.
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/analyze/[id]/page.tsx
git commit -m "feat: session re-open shows Foundation section with readiness score"
```

---

## Task 13: SessionSidebar — Readiness Badge

**Files:**
- Modify: `components/analyze/SessionSidebar.tsx`

- [ ] **Step 1: Read current SessionSidebar**

Read `components/analyze/SessionSidebar.tsx` to see how session list items render.

- [ ] **Step 2: Add readiness score badge to each session item**

Find the session list item render and add the score badge. Look for where session title/date renders and add after it:

```typescript
// Inside the session list item, after the title/date:
{session.readiness_score != null && (
  <span className={`text-xs font-medium ${
    session.readiness_score >= 80
      ? 'text-teal-400'
      : session.readiness_score >= 50
      ? 'text-amber-400'
      : 'text-red-400'
  }`}>
    {session.readiness_score}/100
  </span>
)}
```

The `readiness_score` column already exists on `analysis_results` from prior migrations. No new query needed.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/analyze/SessionSidebar.tsx
git commit -m "feat: show readiness score badge in session sidebar"
```

---

## Task 14: E2E Test

**Files:**
- Modify: `e2e/analyze.spec.ts`

- [ ] **Step 1: Add living document e2e test**

Add this test to `e2e/analyze.spec.ts`:

```typescript
test('living document — create project, paste BRD, see foundation section', async ({ page }) => {
  // Assumes test user is logged in (existing auth setup in spec)
  await page.goto('/analyze')

  // Step 1: Project selector appears
  await expect(page.getByText('Pilih Project')).toBeVisible()

  // Step 2: Create new project
  await page.getByText('+ Project baru').click()
  await page.getByPlaceholder('Nama project').fill('Test Project E2E')
  await page.keyboard.press('Enter')

  // Step 3: Context form appears — skip by clicking Batal
  await page.getByText('Batal').click()

  // Step 4: BRD input appears
  await expect(page.getByRole('textbox')).toBeVisible()
  await page.getByRole('textbox').fill(
    'Sistem perlu fitur approval invoice. Finance Approver bisa approve atau reject invoice dari vendor.'
  )
  await page.getByRole('button', { name: /Analisis/i }).click()

  // Step 5: Analyzing state
  await expect(page.getByText('Menganalisis BRD')).toBeVisible()

  // Step 6: Foundation section appears
  await expect(page.getByText('Foundation')).toBeVisible({ timeout: 30000 })
  await expect(page.getByText('Readiness Score')).toBeVisible()
})

test('living document — re-open session shows readiness score', async ({ page }) => {
  // Navigate to an existing session
  await page.goto('/dashboard')
  await expect(page.getByText(/\d+\/100/)).toBeVisible({ timeout: 10000 })
})
```

- [ ] **Step 2: Run e2e tests**

```bash
npx playwright test e2e/analyze.spec.ts --headed
```

Expected: new tests pass or show meaningful failures that indicate UI is wired correctly (API calls may need a dev server with env vars).

- [ ] **Step 3: Commit**

```bash
git add e2e/analyze.spec.ts
git commit -m "test: e2e for living document — project creation, BRD analysis, re-open"
```

---

## Self-Review Checklist

Spec coverage check:

| Spec requirement | Task |
|---|---|
| Project table + context jsonb | Task 2 |
| Project API routes | Task 3 |
| Project client helpers | Task 4 |
| SectionCard UI | Task 5 |
| Foundation section renders gap list, readiness, Q&A log, assumptions, out-of-scope | Task 6 |
| Living document shell with 9 sections | Task 7 |
| ProjectContextForm (business + technical) | Task 8 |
| ProjectSelector (pick or create) | Task 9 |
| save-session accepts new fields | Task 10 |
| Phase machine replaced with living document | Task 11 |
| Re-open shows readiness + gaps | Task 12 |
| Sidebar shows readiness badge | Task 13 |
| Project context prepended to AI call | Task 11 (handleAnalyze + handleSubmitQA pass projectContext) |

**Out of scope for Plan 3 (deferred to Plan 4):**
- Sections 2–8 generation (Generate buttons wired up)
- Feedback loop (step 8 + 8.5)
- Stale section detection
- Template artifact upload

**Out of scope for Plan 3 (deferred to Plan 5):**
- All export actions
- Prototype prompt with design.md
