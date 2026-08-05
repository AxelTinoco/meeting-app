import { MoreHorizontal } from 'lucide-react'
import { GrndIcon } from './GrndIcon'
import { MX_TZ, mxTimeLabel } from '../lib/mexico-time'
import type { UpcomingItem, UpcomingStatus } from '../lib/dashboard'

interface UpcomingRailProps {
  items: UpcomingItem[]
  now: Date | null
}

export function UpcomingRail({ items, now }: UpcomingRailProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-ink-200 bg-white px-6 py-7">
      <Clock now={now} />

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Agenda de hoy</h2>
        <MoreHorizontal size={18} className="text-ink-400" />
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {items.length === 0 ? (
          <p className="card-empty px-4 py-6">No hay reuniones hoy.</p>
        ) : (
          items.map((item) => <UpcomingCard key={item.id} item={item} />)
        )}
      </div>
    </aside>
  )
}

function Clock({ now }: { now: Date | null }) {
  const time = now
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: MX_TZ,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now)
    : '––:––'

  const date = now
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: MX_TZ,
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
        .format(now)
        .toUpperCase()
    : ''

  return (
    <div suppressHydrationWarning>
      <p className="text-5xl font-extrabold tracking-tight text-ink-900 tabular-nums">
        {time}
      </p>
      <p className="mt-1 text-xs font-semibold tracking-widest text-ink-400">
        {date || ' '}
      </p>
    </div>
  )
}

// Mismos matices que el mapa (ver ROOM_STATUS_STYLES): rosa en curso, azul próxima,
// aqua libre. La franja izquierda usa el neón puro; el badge, el par 100/700.
const BADGE: Record<
  UpcomingStatus,
  { label: string; badge: string; accent: string }
> = {
  active: {
    label: 'En curso',
    badge: 'badge-activa',
    accent: 'border-l-rosa-400',
  },
  incoming: {
    label: 'Próxima',
    badge: 'badge-reservada',
    accent: 'border-l-brand-500',
  },
  ended: {
    label: 'Finalizada',
    badge: 'badge-neutral',
    accent: 'border-l-ink-300',
  },
  free: {
    label: 'Libre',
    badge: 'badge-libre',
    accent: 'border-l-transparent',
  },
}

function UpcomingCard({ item }: { item: UpcomingItem }) {
  const b = BADGE[item.status]
  const range = `${mxTimeLabel(item.start)} – ${mxTimeLabel(item.end)}`

  if (item.status === 'free') {
    return (
      <div className="card-empty px-4 py-3 text-left">
        <div className="mb-1.5 flex items-center justify-between">
          <span className={b.badge}>{b.label}</span>
          <span className="text-xs font-medium text-ink-500">{range}</span>
        </div>
        <p className="text-sm italic text-ink-500">{item.title}</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-ink-200 border-l-4 ${b.accent} bg-white px-4 py-3 shadow-sm ${
        item.status === 'ended' ? 'opacity-60' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={b.badge}>{b.label}</span>
        <span className="text-xs font-medium text-ink-500">{range}</span>
      </div>
      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
      {item.roomName && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-400">
          <GrndIcon name="target" size={12} /> {item.roomName}
        </p>
      )}
    </div>
  )
}
