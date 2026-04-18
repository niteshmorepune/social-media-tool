// Avatar colour is derived from the client name via a hash so it's consistent
// per client without needing a dynamic inline style or unknown hex value.

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
]

function colorFromName(name: string): string {
  const hash = name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-9 h-9 text-sm',
}

export default function ClientAvatar({ name, size = 'md' }: Props) {
  return (
    <div className={`${sizes[size]} ${colorFromName(name)} rounded-lg flex items-center justify-center text-white font-bold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
