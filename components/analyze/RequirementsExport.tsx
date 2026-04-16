'use client'

import { useState } from 'react'
import { RequirementsResult } from '@/types'
import { Button } from '@/components/ui/Button'
import { buildMarkdown } from '@/lib/requirements-markdown'

interface RequirementsExportProps {
  requirements: RequirementsResult
}

export function RequirementsExport({ requirements }: RequirementsExportProps) {
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState(false)

  const markdown = buildMarkdown(requirements)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — show fallback textarea
      setFallback(true)
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requirements-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleCopy} className="flex-1">
          {copied ? '✓ Tersalin!' : 'Copy semua'}
        </Button>
        <Button variant="secondary" onClick={handleDownload} className="flex-1">
          Download .md
        </Button>
      </div>

      {fallback && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500">
            Browser tidak mendukung copy otomatis. Pilih semua teks di bawah dan copy manual.
          </p>
          <textarea
            readOnly
            value={markdown}
            rows={6}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
