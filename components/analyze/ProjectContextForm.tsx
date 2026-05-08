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

  const setB = (key: keyof ProjectContext['business'], value: string | string[]) =>
    setCtx(c => ({ ...c, business: { ...c.business, [key]: value } }))

  const setT = (key: keyof ProjectContext['technical'], value: string | string[]) =>
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
        }
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
              value={toLines(ctx.business.targetUsers)}
              onChange={e => setB('targetUsers', e.target.value)}
              placeholder={'Product Manager\nFinance Approver\nSystem Admin'}
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
              onChange={e => setB('compliance', e.target.value)}
              placeholder={'Data harus onshore Indonesia\nOJK POJK 77/2016'}
            />
          </Field>
          <Field label="Keputusan masa lalu yang relevan" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.business.pastDecisions)}
              onChange={e => setB('pastDecisions', e.target.value)}
              placeholder={'Modul billing lama sudah sunset Q1 2026\nTidak menggunakan microservices'}
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
              value={toLines(ctx.technical.existingSystems)}
              onChange={e => setT('existingSystems', e.target.value)}
              placeholder={'Auth menggunakan Supabase magic link\nPembayaran: Xendit'}
            />
          </Field>
          <Field label="Integrasi pihak ketiga" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.technical.integrations)}
              onChange={e => setT('integrations', e.target.value)}
              placeholder={'Xendit payment gateway\nResend email'}
            />
          </Field>
          <Field label="Constraint arsitektur" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.technical.constraints)}
              onChange={e => setT('constraints', e.target.value)}
              placeholder={'Tidak pakai microservices\nSemua data onshore'}
            />
          </Field>
          <Field label="Technical debt yang perlu diperhatikan" hint="Satu per baris">
            <textarea
              className="input-base"
              rows={2}
              value={toLines(ctx.technical.techDebt)}
              onChange={e => setT('techDebt', e.target.value)}
              placeholder="Legacy payment module belum di-refactor&#10;Auth middleware perlu update untuk compliance"
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
          className="px-4 py-2 text-sm bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
        >
          {saving ? 'Menyimpan...' : 'Simpan Context'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-slate-300 mb-1 cursor-pointer">
      <span className="block mb-1">
        {label}
        {hint && <span className="text-slate-500 text-xs ml-2">({hint})</span>}
      </span>
      {children}
    </label>
  )
}

function toLines(val: string[] | string): string {
  return Array.isArray(val) ? val.join('\n') : val
}

function toArray(val: string[] | string): string[] {
  if (Array.isArray(val)) return val.filter(Boolean)
  return val.split('\n').map(s => s.trim()).filter(Boolean)
}
