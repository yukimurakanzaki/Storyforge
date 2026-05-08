'use client'
import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { fetchProjects, createProject, updateProjectContext } from '@/lib/projects'
import { ProjectContextForm } from './ProjectContextForm'

type Props = {
  onSelect: (project: Project) => void
}

export function ProjectSelector({ onSelect }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showContextForm, setShowContextForm] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setError('Gagal memuat project. Muat ulang halaman.'))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const project = await createProject(newName.trim())
      setProjects(p => [project, ...p])
      setNewName('')
      setCreating(false)
      setShowContextForm(project)
    } catch {
      setError('Gagal membuat project. Coba lagi.')
    }
  }

  const handleContextSaved = async (
    project: Project,
    context: Parameters<typeof updateProjectContext>[1]
  ) => {
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
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm rounded-lg transition-colors"
          >
            Buat
          </button>
          <button
            onClick={() => { setCreating(false); setNewName('') }}
            className="px-3 py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Batal
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
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
              {project.designMd ? ' · design.md ✓' : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
