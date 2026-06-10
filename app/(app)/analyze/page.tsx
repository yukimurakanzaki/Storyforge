'use client'
import { WorkspaceShell } from '@/components/analyze/workspace/WorkspaceShell'
import { LegacyAnalyzeClient } from './LegacyAnalyzeClient'

export default function AnalyzePage() {
  if (process.env.NEXT_PUBLIC_LIVING_WORKSPACE === 'true') return <WorkspaceShell />
  return <LegacyAnalyzeClient />
}
