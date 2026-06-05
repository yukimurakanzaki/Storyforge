'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TierBadge } from '@/components/ui/TierBadge'

type DeletionStep = 'idle' | 'password' | 'confirm' | 'deleting'

export default function SettingsPage() {
  const router = useRouter()

  // --- Plan State ---
  const [userPlan, setUserPlan] = useState<'free' | 'pro' | null>(null)

  // Fetch user plan on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .single()
        setUserPlan((sub?.plan as 'free' | 'pro') ?? 'free')
      }
    })
  }, [])

  // --- Simple Logout State ---
  const [simpleLogoutLoading, setSimpleLogoutLoading] = useState(false)

  // --- Global Logout State ---
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [logoutConfirm, setLogoutConfirm] = useState(false)

  // --- Account Deletion State ---
  const [deletionStep, setDeletionStep] = useState<DeletionStep>('idle')
  const [password, setPassword] = useState('')
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [deletionError, setDeletionError] = useState('')
  const [deletionLoading, setDeletionLoading] = useState(false)

  // --- Konteks & Memori State ---
  const [ctx, setCtx] = useState({ industry: '', role: '', compliance: '', techDefaults: '', standingInstructions: '', prdTemplate: '' })
  const [ctxSaved, setCtxSaved] = useState(false)
  const [ctxSaving, setCtxSaving] = useState(false)

  // --- Konteks & Memori Load + Save ---
  useEffect(() => {
    fetch('/api/user-context').then(r => r.json()).then(({ context }) => {
      if (context) setCtx({
        industry: context.industry ?? '', role: context.role ?? '',
        compliance: (context.compliance ?? []).join(', '),
        techDefaults: Object.entries(context.tech_defaults ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
        standingInstructions: context.standing_instructions ?? '', prdTemplate: context.prd_template ?? '',
      })
    }).catch(() => {})
  }, [])

  async function saveContext(e: React.FormEvent) {
    e.preventDefault(); setCtxSaving(true); setCtxSaved(false)
    const techDefaults: Record<string, string> = {}
    for (const line of ctx.techDefaults.split('\n')) {
      const [k, ...rest] = line.split(':'); if (k.trim() && rest.length) techDefaults[k.trim()] = rest.join(':').trim()
    }
    const res = await fetch('/api/user-context', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: ctx.industry, role: ctx.role,
        compliance: ctx.compliance.split(',').map(s => s.trim()).filter(Boolean),
        techDefaults, standingInstructions: ctx.standingInstructions, prdTemplate: ctx.prdTemplate }) })
    setCtxSaving(false); if (res.ok) setCtxSaved(true)
  }

  // --- Simple Logout Handler ---
  async function handleSimpleLogout() {
    setSimpleLogoutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // --- Global Logout Handler ---
  async function handleLogoutAll() {
    if (!logoutConfirm) {
      setLogoutConfirm(true)
      return
    }

    setLogoutLoading(true)
    setLogoutError('')

    try {
      const res = await fetch('/api/auth/logout-all', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setLogoutError(data.error || 'Gagal keluar dari semua perangkat. Silakan coba lagi.')
        setLogoutLoading(false)
        setLogoutConfirm(false)
        return
      }

      // Success: sign out current session and redirect to login
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setLogoutError('Gagal keluar dari semua perangkat. Silakan coba lagi.')
      setLogoutLoading(false)
      setLogoutConfirm(false)
    }
  }

  function cancelLogout() {
    setLogoutConfirm(false)
    setLogoutError('')
  }

  // --- Account Deletion Handlers ---
  function startDeletion() {
    setDeletionStep('password')
    setDeletionError('')
    setPassword('')
    setConfirmPhrase('')
  }

  function cancelDeletion() {
    setDeletionStep('idle')
    setDeletionError('')
    setPassword('')
    setConfirmPhrase('')
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return

    // Move to confirmation step (actual password verification happens on final submit)
    setDeletionStep('confirm')
    setDeletionError('')
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()

    if (confirmPhrase !== 'HAPUS AKUN') {
      setDeletionError('Frasa konfirmasi harus tepat "HAPUS AKUN".')
      return
    }

    setDeletionLoading(true)
    setDeletionError('')

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPhrase }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Map specific error cases
        if (res.status === 401) {
          setDeletionError('Password salah. Verifikasi gagal.')
          setDeletionStep('password')
          setPassword('')
        } else if (res.status === 400) {
          setDeletionError(data.error || 'Frasa konfirmasi tidak valid.')
        } else {
          setDeletionError(data.error || 'Gagal menghapus akun. Silakan coba lagi.')
        }
        setDeletionLoading(false)
        return
      }

      // Success: sign out, clear cookies, redirect to landing page
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch {
      setDeletionError('Terjadi kesalahan. Silakan coba lagi.')
      setDeletionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-lg font-bold text-teal-600">
              StoryForge<span className="text-gray-800">.id</span>
            </Link>
            {userPlan && <TierBadge plan={userPlan} />}
          </div>
          <nav className="flex items-center gap-4 text-sm text-gray-500">
            <Link href="/analyze" className="hover:text-gray-800 transition-colors">
              Analisis Baru
            </Link>
            <Link href="/dashboard" className="hover:text-gray-800 transition-colors">
              Riwayat
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Pengaturan Akun</h1>

        {/* Konteks & Memori Section */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Konteks &amp; Memori</h2>
          <p className="text-sm text-gray-500 mb-4">Dibaca AI sebelum menganalisis setiap requirement — agar pertanyaannya relevan dan kontradiksi (mis. SFTP vs S3, pelanggaran OJK) langsung ditandai.</p>
          <form onSubmit={saveContext} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-gray-700">Industri
              <input value={ctx.industry} onChange={e => setCtx({ ...ctx, industry: e.target.value })} placeholder="mis. fintech"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-gray-700">Peran kamu
              <input value={ctx.role} onChange={e => setCtx({ ...ctx, role: e.target.value })} placeholder="mis. Product Manager"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-gray-700">Regulasi / compliance (pisahkan dengan koma)
              <input value={ctx.compliance} onChange={e => setCtx({ ...ctx, compliance: e.target.value })} placeholder="OJK, PDP"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-gray-700">Default teknis (satu per baris, format key: value)
              <textarea value={ctx.techDefaults} onChange={e => setCtx({ ...ctx, techDefaults: e.target.value })} rows={3} placeholder={"storage: S3\nbackend: Supabase"}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" /></label>
            <label className="text-sm font-medium text-gray-700">Instruksi tetap untuk AI
              <textarea value={ctx.standingInstructions} onChange={e => setCtx({ ...ctx, standingInstructions: e.target.value })} rows={3} placeholder="mis. Selalu jawab dalam Bahasa Indonesia. Hindari jargon."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-gray-700">Template PRD (opsional — kosongkan untuk format default)
              <textarea value={ctx.prdTemplate} onChange={e => setCtx({ ...ctx, prdTemplate: e.target.value })} rows={4} placeholder="Tempel struktur PRD pilihanmu di sini."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" /></label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={ctxSaving} className="self-start rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60">
                {ctxSaving ? 'Menyimpan...' : 'Simpan Konteks'}</button>
              {ctxSaved && <span className="text-sm text-teal-600">Tersimpan ✓</span>}
            </div>
          </form>
        </section>

        {/* Security Section */}
        <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Keamanan</h2>

          {/* Simple Logout */}
          <div className="flex flex-col gap-3 mb-6 pb-6 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Keluar dari sesi ini saja.
            </p>
            <button
              type="button"
              onClick={handleSimpleLogout}
              disabled={simpleLogoutLoading}
              className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {simpleLogoutLoading ? 'Keluar...' : 'Keluar'}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Keluar dari semua perangkat yang sedang login dengan akun kamu.
            </p>

            {logoutError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {logoutError}
              </div>
            )}

            {!logoutConfirm ? (
              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={logoutLoading}
                className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keluar dari semua perangkat
              </button>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Kamu yakin ingin keluar dari semua perangkat? Kamu akan perlu login ulang di semua perangkat.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLogoutAll}
                    disabled={logoutLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {logoutLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memproses...
                      </span>
                    ) : (
                      'Ya, keluar semua'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelLogout}
                    disabled={logoutLoading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone Section */}
        <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700 mb-4">Zona Bahaya</h2>

          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Menghapus akun akan menghapus semua data kamu secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>

            {deletionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deletionError}
              </div>
            )}

            {/* Step 1: Idle - Show delete button */}
            {deletionStep === 'idle' && (
              <button
                type="button"
                onClick={startDeletion}
                className="self-start rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 hover:border-red-400"
              >
                Hapus Akun
              </button>
            )}

            {/* Step 2: Password re-authentication */}
            {deletionStep === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
                <p className="text-sm font-medium text-gray-800">
                  Masukkan password kamu untuk verifikasi:
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password kamu"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!password}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Lanjutkan
                  </button>
                  <button
                    type="button"
                    onClick={cancelDeletion}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Confirmation phrase */}
            {deletionStep === 'confirm' && (
              <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
                <p className="text-sm font-medium text-gray-800">
                  Ketik <span className="font-bold text-red-700">HAPUS AKUN</span> untuk konfirmasi:
                </p>
                <input
                  type="text"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  placeholder="Ketik HAPUS AKUN"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={deletionLoading || confirmPhrase !== 'HAPUS AKUN'}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletionLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Menghapus...
                      </span>
                    ) : (
                      'Hapus Akun Saya'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelDeletion}
                    disabled={deletionLoading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Deleting state is handled by the loading state in step 3 */}
          </div>
        </section>
      </main>
    </div>
  )
}
