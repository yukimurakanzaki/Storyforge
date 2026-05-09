export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SectionCard } from '@/components/analyze/SectionCard'
import { FoundationSection } from '@/components/analyze/FoundationSection'
import type { FoundationData, SectionStates } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SessionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/analyze/${id}`)

  const { data: session } = await supabase
    .from('analysis_results')
    .select('*, projects(name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!session) notFound()

  // Support both new sections.foundation format and legacy fields
  const foundationData: FoundationData = (session.sections as Record<string, unknown> | null)?.foundation
    ? (session.sections as Record<string, FoundationData>).foundation
    : {
        brd_summary: (session.brd_text as string | null)?.slice(0, 500) ?? '',
        gap_list: (session.gap_list as FoundationData['gap_list']) ?? [],
        readiness_score: (session.readiness_score as number) ?? 0,
        readiness_label: (session.readiness_label as string) ?? '',
        qa_log: [],
        assumptions: [],
        out_of_scope: [],
      }

  const sectionStates: SectionStates = (session.section_states as SectionStates | null) ?? {
    foundation: 'done',
    roles: 'empty',
    flow: 'empty',
    engineer: 'empty',
    designer: 'empty',
    qa: 'empty',
    templates: 'empty',
    stakeholder: 'empty',
  }

  const score = foundationData.readiness_score ?? 0
  const scoreColor = score >= 80 ? 'text-teal-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  const projectName = (session as unknown as { projects?: { name: string } | null }).projects?.name ?? 'Tanpa Project'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-500 text-xs mb-1">{projectName}</div>
          <h1 className="text-slate-100 font-semibold text-lg">
            {(session.brd_text as string | null)?.slice(0, 60)}...
          </h1>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}</div>
          <div className="text-slate-500 text-xs">Readiness Score</div>
        </div>
      </div>

      <SectionCard
        title="Foundation"
        icon="📌"
        badges={['PM', 'Semua']}
        status={sectionStates.foundation ?? 'done'}
      >
        <FoundationSection data={foundationData} />
      </SectionCard>

      <div className="text-center pt-4">
        <p className="text-slate-500 text-sm">
          Untuk melanjutkan sesi ini, gunakan halaman Analyze dan lanjutkan dari Q&amp;A.
        </p>
      </div>
    </main>
  )
}
