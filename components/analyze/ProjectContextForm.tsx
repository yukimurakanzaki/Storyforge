'use client'
import { useState } from 'react'
import { ProjectContext } from '@/types'

type FormDraft = {
  business: {
    description: string
    targetUsers: string
    domain: string
    compliance: string
    namingConventions: Record<string, string>
    pastDecisions: string
  }
  technical: {
    frontend: string
    backend: string
    existingSystems: string
    integrations: string
    constraints: string
    techDebt: string
  }
}

const DEFAULT_DRAFT: FormDraft = {
  business: { description: '', targetUsers: '', domain: '', compliance: '', namingConventions: {}, pastDecisions: '' },
  technical: { frontend: '', backend: '', existingSystems: '', integrations: '', constraints: '', techDebt: '' },
}

type Props = {
  initial?: ProjectContext
  onSave: (context: ProjectContext) => Promise<void>
  onCancel: () => void
}

function toLines(val: string[] | string): string {
  return Array.isArray(val) ? val.join('\n') : val
}

function toArray(val: string): string[] {
  return val.split('\n').map(s => s.trim()).filter(Boolean)
}

function toDraft(ctx: ProjectContext): FormDraft {
  return {
    business: {
      description: ctx.business.description,
      targetUsers: toLines(ctx.business.targetUsers),
      domain: ctx.business.domain,
      compliance: toLines(ctx.business.compliance),
      namingConventions: ctx.business.namingConventions,
      pastDecisions: toLines(ctx.business.pastDecisions),
    },
    technical: {
      frontend: ctx.technical.frontend,
      backend: ctx.technical.backend,
      existingSystems: toLines(ctx.technical.existingSystems),
      integrations: toLines(ctx.technical.integrations),
      constraints: toLines(ctx.technical.constraints),
      techDebt: toLines(ctx.technical.techDebt),
    },
  }
}

export function ProjectContextForm({ initial, onSave, onCancel }: Props) {
  const [ctx, setCtx] = useState<FormDraft>(initial ? toDraft(initial) : DEFAULT_DRAFT)
  const [saving, setSaving] = useState(false)

  const setB = (key: keyof FormDraft['business'], value: string | Record<string, string>) =>
    setCtx(c => ({ ...c, business: { ...c.business, [key]: value } }))

  const setT = (key: keyof FormDraft['technical'], value: string) =>
    setCtx(c => ({ ...c, technical: { ...c.technical, [key]: value } }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const parsed: ProjectContext = {
        business: {
          ...ctx.business,
          targetUsers: toArray(ctx.business.targetUsers),
          compliance: toArray(ctx.business.compliance),
          pastDecisions: toArray(ctx.business.pastDecisions),
        },
        technical: {
          ...ctx.technical,
          existingSystems: toArray(ctx.technical.existingSystems),
          integrations: toArray(ctx.technical.integrations),
          constraints: toArray(ctx.technical.constraints),
          techDebt: toArray(ctx.technical.techDebt),
        },
      }
      await onSave(parsed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-slate-200 font-semibold mb-4">Profil Bisnis</h3>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Deskripsi produk / perusahaan
              <span className="text-slate-500 text-xs ml-2">(Apa yang dibangun, untuk siapa)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.business.description}
              onChange={e => setB('description', e.target.value)}
              placeholder="Contoh: Platform analisis BRD untuk Product Manager Indonesia..."
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Target users
              <span className="text-slate-500 text-xs ml-2">(Satu per baris — role nyata yang ada di sistem)</span>
            </span>
            <textarea
              className="input-base"
              rows={3}
              value={ctx.business.targetUsers}
              onChange={e => setB('targetUsers', e.target.value)}
              placeholder={"Product Manager\nFinance Approver\nSystem Admin"}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">Domain bisnis</span>
            <input
              className="input-base"
              value={ctx.business.domain}
              onChange={e => setB('domain', e.target.value)}
              placeholder="Contoh: B2B SaaS, Fintech, E-commerce"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Aturan compliance / regulasi
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.business.compliance}
              onChange={e => setB('compliance', e.target.value)}
              placeholder={"Data harus onshore Indonesia\nOJK POJK 77/2016"}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Keputusan masa lalu yang relevan
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.business.pastDecisions}
              onChange={e => setB('pastDecisions', e.target.value)}
              placeholder={"Modul billing lama sudah sunset Q1 2026\nTidak menggunakan microservices"}
            />
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-slate-200 font-semibold mb-4">Profil Teknis</h3>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">Frontend stack</span>
            <input
              className="input-base"
              value={ctx.technical.frontend}
              onChange={e => setT('frontend', e.target.value)}
              placeholder="Next.js 14, Tailwind CSS, TypeScript"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">Backend stack</span>
            <input
              className="input-base"
              value={ctx.technical.backend}
              onChange={e => setT('backend', e.target.value)}
              placeholder="Supabase, QStash, Vercel Edge Functions"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Sistem yang sudah ada
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={3}
              value={ctx.technical.existingSystems}
              onChange={e => setT('existingSystems', e.target.value)}
              placeholder={"Auth menggunakan Supabase magic link\nPembayaran: Xendit"}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Integrasi pihak ketiga
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.technical.integrations}
              onChange={e => setT('integrations', e.target.value)}
              placeholder={"Xendit payment gateway\nResend email"}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Constraint arsitektur
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.technical.constraints}
              onChange={e => setT('constraints', e.target.value)}
              placeholder={"Tidak pakai microservices\nSemua data onshore"}
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300 mb-1 block">
              Tech debt yang relevan
              <span className="text-slate-500 text-xs ml-2">(Satu per baris)</span>
            </span>
            <textarea
              className="input-base"
              rows={2}
              value={ctx.technical.techDebt}
              onChange={e => setT('techDebt', e.target.value)}
              placeholder={"Legacy billing module belum di-refactor\nAPI rate limiting belum diimplementasi"}
            />
          </label>
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
