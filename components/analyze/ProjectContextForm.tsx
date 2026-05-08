'use client'
import { useState } from 'react'
import { ProjectContext } from '@/types'

const DEFAULT_CONTEXT: ProjectContext = {
  business: {
    description: '',
    targetUsers: [],
    domain: '',
    compliance: [],
    namingConventions: {},
    pastDecisions: [],
  },
  technical: {
    frontend: '',
    backend: '',
    existingSystems: [],
    integrations: [],
    constraints: [],
    techDebt: [],
  },
}

type Props = {
  initial?: ProjectContext
  onSave: (context: ProjectContext) => Promise<void>
  onCancel: () => void
}

function toLines(val: string[] | string): string {
  return Array.isArray(val) ? val.join('\n') : val
}

function toArray(val: string[] | string): string[] {
  if (Array.isArray(val)) return val.filter(Boolean)
  return val.split('\n').map(s => s.trim()).filter(Boolean)
}

export function ProjectContextForm({ initial, onSave, onCancel }: Props) {
  const [ctx, setCtx] = useState<ProjectContext>(initial ?? DEFAULT_CONTEXT)
  const [saving, setSaving] = useState(false)

  const setB = (key: keyof ProjectContext['business'], value: string) =>
    setCtx(c => ({ ...c, business: { ...c.business, [key]: value } }))

  const setT = (key: keyof ProjectContext['technical'], value: string) =>
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
              value={toLines(ctx.business.targetUsers)}
              onChange={e => setB('targetUsers', e.target.value as unknown as string[])}
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
              value={toLines(ctx.business.compliance)}
              onChange={e => setB('compliance', e.target.value as unknown as string[])}
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
              value={toLines(ctx.business.pastDecisions)}
              onChange={e => setB('pastDecisions', e.target.value as unknown as string[])}
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
              value={toLines(ctx.technical.existingSystems)}
              onChange={e => setT('existingSystems', e.target.value as unknown as string[])}
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
              value={toLines(ctx.technical.integrations)}
              onChange={e => setT('integrations', e.target.value as unknown as string[])}
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
              value={toLines(ctx.technical.constraints)}
              onChange={e => setT('constraints', e.target.value as unknown as string[])}
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
              value={toLines(ctx.technical.techDebt)}
              onChange={e => setT('techDebt', e.target.value as unknown as string[])}
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
