'use client'

import { FREE_WATERMARK } from '@/lib/constants'

interface WatermarkProps {
  plan: 'free' | 'pro'
}

/**
 * Renders a branded watermark at the bottom of analysis output sections.
 * Only visible for free-tier users; returns null for pro-tier.
 * Copy is the OQ-6 decision, shared via FREE_WATERMARK.
 */
export function Watermark({ plan }: WatermarkProps): JSX.Element | null {
  if (plan === 'pro') {
    return null
  }

  return (
    <p className="mt-4 text-center text-xs text-gray-400 opacity-60 select-none">
      {FREE_WATERMARK}
    </p>
  )
}
