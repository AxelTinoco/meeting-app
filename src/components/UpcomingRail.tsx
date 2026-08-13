import { MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar } from './Avatar'
import { GrndIcon } from './GrndIcon'
import { MX_TZ, mxTimeLabel } from '../lib/mexico-time'
import { railItemVariants, staggerContainer } from '../lib/motion'
import type { UpcomingItem, UpcomingStatus } from '../lib/dashboard'
import type { BookingAttendee } from '../lib/types'

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

      {/* La agenda se recalcula cada minuto (useNow): las tarjetas cambian de
          estado y entran/salen solas, así que la lista anima presencia y no
          solo la carga inicial. */}
      <motion.div
        className="flex flex-col gap-3 overflow-y-auto"
        variants={staggerContainer(0.06, 0.1)}
        initial="hidden"
        animate="visible"
      >
        {items.length === 0 ? (
          <p className="card-empty px-4 py-6">No hay reuniones hoy.</p>
        ) : (
          <AnimatePresence>
            {items.map((item) => (
              <UpcomingCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        )}
      </motion.div>
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
        {/* La `key` es la hora: al cambiar el minuto el span se remonta y vuelve
            a correr su `initial`, así el reloj «cae» en vez de saltar. */}
        <motion.span
          key={time}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="inline-block"
        >
          {time}
        </motion.span>
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
      <motion.div
        layout
        variants={railItemVariants}
        initial="hidden"
        exit="exit"
        className="card-empty px-4 py-3 text-left"
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className={b.badge}>{b.label}</span>
          <span className="text-xs font-medium text-ink-500">{range}</span>
        </div>
        <p className="text-sm italic text-ink-500">{item.title}</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      variants={railItemVariants}
      custom={item.status === 'ended'}
      // `initial` explícito aunque el riel ya orqueste: sin él el SSR no emite
      // el estado inicial y la hidratación produce un parpadeo (ver RoomTile).
      initial="hidden"
      exit="exit"
      className={`rounded-xl border border-ink-200 border-l-4 ${b.accent} bg-white px-4 py-3 shadow-sm`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className={b.badge}>{b.label}</span>
        <span className="text-xs font-medium text-ink-500">{range}</span>
      </div>
      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        {item.roomName ? (
          <p className="inline-flex items-center gap-1 text-xs text-ink-400">
            <GrndIcon name="target" size={12} /> {item.roomName}
          </p>
        ) : (
          <span />
        )}
        <AttendeeStack attendees={item.attendees} />
      </div>
    </motion.div>
  )
}

/** Cuántas caras caben en la tarjeta antes de resumir con "+N". */
const STACK_MAX = 4

/** Pila de caras superpuestas. El anillo blanco es lo que separa una foto de la siguiente. */
function AttendeeStack({ attendees }: { attendees?: BookingAttendee[] }) {
  if (!attendees?.length) return null

  const shown = attendees.slice(0, STACK_MAX)
  const rest = attendees.length - shown.length

  return (
    <div className="flex shrink-0 items-center -space-x-1.5">
      {shown.map((a) => (
        <Avatar
          key={a.email}
          email={a.email}
          name={a.displayName}
          picture={a.picture}
          size={22}
          // Aquí el avatar va solo, sin el nombre al lado: sin `alt` un lector de
          // pantalla no diría a quién corresponde la cara.
          alt={a.displayName ?? a.email}
          className="ring-2 ring-white"
        />
      ))}
      {rest > 0 && (
        <span
          title={attendees
            .slice(STACK_MAX)
            .map((a) => a.displayName ?? a.email)
            .join(', ')}
          className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ink-200 text-[9px] font-semibold leading-none text-ink-600 ring-2 ring-white"
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
