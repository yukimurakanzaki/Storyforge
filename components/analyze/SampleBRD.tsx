'use client'

import { Button } from '@/components/ui/Button'

interface SampleBRDProps {
  onLoad: () => void
  disabled?: boolean
}

export function SampleBRD({ onLoad, disabled = false }: SampleBRDProps) {
  return (
    <Button variant="secondary" onClick={onLoad} disabled={disabled}>
      Coba dengan contoh BRD →
    </Button>
  )
}
