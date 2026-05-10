type BadgeColor = 'green' | 'yellow' | 'red' | 'gray'

interface BadgeProps {
  label: string
  color?: BadgeColor
  className?: string
  dark?: boolean
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
}

const darkColorClasses: Record<BadgeColor, string> = {
  green: 'bg-teal-900/40 text-teal-300 border border-teal-700',
  yellow: 'bg-amber-900/40 text-amber-300 border border-amber-700',
  red: 'bg-red-900/40 text-red-300 border border-red-700',
  gray: 'bg-slate-800 text-slate-300 border border-slate-700',
}

export function Badge({ label, color = 'gray', className = '', dark = false }: BadgeProps) {
  const classes = dark ? darkColorClasses[color] : colorClasses[color]
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        classes,
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
