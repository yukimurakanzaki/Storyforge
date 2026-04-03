type BadgeColor = 'green' | 'yellow' | 'red' | 'gray'

interface BadgeProps {
  label: string
  color?: BadgeColor
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ label, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorClasses[color],
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
