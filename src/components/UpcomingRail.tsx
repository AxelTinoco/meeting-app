import { MapPin, MoreHorizontal } from 'lucide-react'
import { MX_TZ, mxTimeLabel } from '../lib/mexico-time'
import type { UpcomingItem, UpcomingStatus } from '../lib/dashboard'

interface UpcomingRailProps {
  items: UpcomingItem[]
  now: Date | null
}

export function UpcomingRail({ items, now }: UpcomingRailProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white px-6 py-7">
      <Clock now={now} />

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Agenda de hoy</h2>
        <MoreHorizontal size={18} className="text-slate-400" />
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            No hay reuniones hoy.
          </p>
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
      <p className="text-5xl font-extrabold tracking-tight text-slate-900 tabular-nums">
        {time}
      </p>
      <p className="mt-1 text-xs font-semibold tracking-widest text-slate-400">
        {date || ' '}
      </p>
    </div>
  )
}

const BADGE: Record<UpcomingStatus, { label: string; badge: string; accent: string }> = {
  active: {
    label: 'En curso',
    badge: 'bg-violet-100 text-violet-700',
    accent: 'border-l-violet-500',
  },
  incoming: {
    label: 'Próxima',
    badge: 'bg-rose-100 text-rose-600',
    accent: 'border-l-amber-500',
  },
  ended: {
    label: 'Finalizada',
    badge: 'bg-slate-100 text-slate-500',
    accent: 'border-l-slate-300',
  },
  free: {
    label: 'Libre',
    badge: 'bg-emerald-100 text-emerald-700',
    accent: 'border-l-transparent',
  },
}

function UpcomingCard({ item }: { item: UpcomingItem }) {
  const b = BADGE[item.status]
  const range = `${mxTimeLabel(item.start)} – ${mxTimeLabel(item.end)}`

  if (item.status === 'free') {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.badge}`}>
            {b.label}
          </span>
          <span className="text-xs font-medium text-slate-500">{range}</span>
        </div>
        <p className="text-sm italic text-slate-500">{item.title}</p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 border-l-4 ${b.accent} bg-white px-4 py-3 shadow-sm ${
        item.status === 'ended' ? 'opacity-60' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.badge}`}>
          {b.label}
        </span>
        <span className="text-xs font-medium text-slate-500">{range}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
      {item.roomName && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={12} /> {item.roomName}
        </p>
      )}
    </div>
  )
}
