interface TierBadgeProps {
  plan: 'free' | 'pro'
}

export function TierBadge({ plan }: TierBadgeProps) {
  const isFree = plan === 'free'

  const classes = isFree
    ? 'bg-gray-100 text-gray-700 border border-gray-300'
    : 'bg-teal-100 text-teal-800 border border-teal-300'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}
    >
      {isFree ? 'Free' : 'Pro'}
    </span>
  )
}
