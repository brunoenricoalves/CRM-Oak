function hashHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarInitials({ name, size = 'md' }: Props) {
  const hue = hashHue(name)
  const initials = getInitials(name)
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-xs' :
    size === 'lg' ? 'w-16 h-16 text-xl' :
    'w-10 h-10 text-sm'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 60%, 45%)` }}
    >
      {initials}
    </div>
  )
}
