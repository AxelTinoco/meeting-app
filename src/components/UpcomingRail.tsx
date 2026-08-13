import { MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar } from './Avatar'
import { GrndIcon } from './GrndIcon'
import { MX_TZ, mxTimeLabel } from '../lib/mexico-time'
import {
  clockDigitVariants,
  railItemVariants,
  staggerContainer,
} from '../lib/motion'
import type { UpcomingItem, UpcomingStatus } from '../lib/dashboard'
import type { BookingAttendee } from '../lib/types'

interface UpcomingRailProps {
  items: UpcomingItem[]
  /**
   * Solo para el reloj, y por eso sigue admitiendo `null` mientras el cliente no
   * hidrata: los estados de las tarjetas ya vienen resueltos con la hora del servidor
   * (ver `serverNow` en la ruta), pero el reloj imprime nombre de día y de mes con
   * `Intl`, y esas cadenas pueden no coincidir letra por letra entre el runtime del
   * servidor y el navegador. Mostrar «––:––» un instante es preferible a arriesgar
   * una discrepancia de hidratación en cada carga.
   */
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

const CLOCK_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: MX_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const DATE_FMT = new Intl.DateTimeFormat('es-MX', {
  timeZone: MX_TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

/** La hora partida en piezas, para poder animar hora y minutos por separado. */
function clockParts(now: Date) {
  const parts = CLOCK_FMT.formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return {
    hour: value('hour'),
    minute: value('minute'),
    dayPeriod: value('dayPeriod'),
  }
}

function Clock({ now }: { now: Date | null }) {
  const date = now ? DATE_FMT.format(now).toUpperCase() : ''

  return (
    <div suppressHydrationWarning>
      <p className="flex items-end text-5xl font-extrabold leading-none tracking-tight text-ink-900 tabular-nums">
        {now ? <ClockDigits {...clockParts(now)} /> : '––:––'}
      </p>
      <p className="mt-2 text-xs font-semibold tracking-widest text-ink-400">
        {date || ' '}
      </p>
    </div>
  )
}

function ClockDigits({
  hour,
  minute,
  dayPeriod,
}: ReturnType<typeof clockParts>) {
  return (
    <>
      <RollingNumber value={hour} />
      {/* Los dos puntos no cambian nunca, y por eso quedan fuera de la
          animacion: dentro de ella se moverian en cada minuto sin motivo. */}
      <span aria-hidden>:</span>
      <RollingNumber value={minute} />
      {dayPeriod && (
        // `layout` para que acompanie el desplazamiento cuando la hora pasa de
        // una cifra a dos (9 -> 10) en vez de saltar a su nueva posicion.
        <motion.span layout className="pb-0.5 pl-1.5 text-lg text-ink-400">
          {dayPeriod}
        </motion.span>
      )}
    </>
  )
}

/**
 * Numero que rueda digito a digito.
 *
 * Cada posicion tiene su propia presencia, asi que al pasar de 3:59 a 4:00 solo
 * se mueven los digitos que de verdad cambiaron y el resto se queda quieto: eso
 * es lo que lo hace leer como una rueda y no como un parpadeo del reloj entero.
 *
 * `initial={false}` evita que ruede en la primera pintada (nada ha cambiado
 * todavia: acaba de aparecer) y `mode="popLayout"` saca del flujo al digito que
 * se va, para que el que entra ocupe su sitio en lugar de empujarlo a un lado.
 */
function RollingNumber({ value }: { value: string }) {
  return (
    // `layout` porque el ancho cambia al pasar de una cifra a dos (9 -> 10) y
    // sin el, lo que va detras pega un salto justo en ese momento.
    <motion.span layout className="flex">
      {value.split('').map((digit, i) => (
        <span
          // La posicion dentro del numero es la identidad estable del carril; el
          // valor es lo que se remonta dentro de el.
          key={i}
          // `relative` lo exige popLayout (ahi va absoluto el saliente) y
          // `overflow-hidden` es el que recorta la vuelta de la rueda; el padding
          // deja respirar a la tipografia para que no se corte en reposo.
          className="relative inline-block overflow-hidden py-[0.08em]"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={digit}
              variants={clockDigitVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="block"
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </motion.span>
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
