'use client'

interface UsageCounterProps {
  /** Number of analyses used this period */
  used: number
  /** Tier's monthly cap (3 for free, 50 for pro) */
  limit: number
  /** User's subscription plan */
  plan: 'free' | 'pro'
  /** Click handler — used for free-tier upgrade CTA trigger */
  onClick?: () => void
  /** Whether usage data failed to load */
  error?: boolean
}

/**
 * Determines the color class based on remaining usage percentage.
 * Only called when limit > 0.
 */
export function getUsageColorClass(used: number, limit: number): string {
  const remaining = (limit - used) / limit

  if (remaining > 0.5) {
    return 'text-green-600'
  }
  if (remaining >= 0.25) {
    return 'text-yellow-600'
  }
  return 'text-red-600'
}

/**
 * Formats the usage counter display text.
 * Returns the standard "{used}/{limit} analisis" format when limit > 0.
 */
export function formatUsageText(used: number, limit: number): string {
  return `${used}/${limit} analisis`
}

/**
 * Displays the user's analysis usage count with color-coded status.
 *
 * Color logic (based on remaining percentage):
 * - Green: remaining > 50%
 * - Yellow: 25% <= remaining <= 50%
 * - Red: remaining < 25%
 *
 * Special cases:
 * - limit === 0: displays "N/A" in gray (no percentage calculation)
 * - error === true: displays fallback "—/— analisis" in gray
 */
export function UsageCounter({
  used,
  limit,
  plan,
  onClick,
  error,
}: UsageCounterProps): JSX.Element {
  // Fallback state: data fetch failed
  if (error) {
    return (
      <span
        className="text-sm font-medium text-gray-400"
        aria-label="Data penggunaan tidak tersedia"
      >
        —/— analisis
      </span>
    )
  }

  // Zero-limit special case: no percentage calculation
  if (limit === 0) {
    return (
      <span
        className="text-sm font-medium text-gray-400"
        aria-label="Batas analisis tidak tersedia"
      >
        N/A
      </span>
    )
  }

  const colorClass = getUsageColorClass(used, limit)
  const text = formatUsageText(used, limit)

  // Clickable for free-tier users (triggers upgrade CTA)
  if (onClick && plan === 'free') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`text-sm font-medium ${colorClass} cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded`}
        aria-label={`${text} — klik untuk upgrade`}
      >
        {text}
      </button>
    )
  }

  return (
    <span className={`text-sm font-medium ${colorClass}`} aria-label={text}>
      {text}
    </span>
  )
}
