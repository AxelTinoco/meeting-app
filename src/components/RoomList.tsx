import { motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { ROOM_STATUS_STYLES, deriveRoomView } from '../lib/dashboard'
import { mxTimeLabel } from '../lib/mexico-time'
import { springSnappy } from '../lib/motion'
import type { Booking, Room } from '../lib/types'

interface RoomListProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  onSelect: (room: Room) => void
  className?: string
}

/** Milisegundos de retraso entre una sala y la siguiente al entrar. */
const STAGGER_MS = 50

/**
 * Las salas en vertical, para móvil. Sustituye al plano y no lo reduce: a 375px
 * de ancho una sala del mapa mide poco más de 100px, así que el plano deja de
 * decir dónde está cada sala y solo estorba a lo único que se consulta desde el
 * teléfono — si está libre y hasta cuándo.
 *
 * La entrada es la misma animación CSS del mapa (`tile-enter`) y por el mismo
 * motivo: se pinta con el HTML del servidor, sin esperar a la hidratación.
 */
export function RoomList({
  rooms,
  bookings,
  now,
  onSelect,
  className = '',
}: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <p className="card-empty px-6 py-8">No hay salas configuradas.</p>
      </div>
    )
  }

  return (
    <ul className={`flex flex-col gap-3 p-4 ${className}`}>
      {rooms.map((room, i) => (
        <RoomListItem
          key={room.resourceEmail}
          view={deriveRoomView(room, bookings, now)}
          index={i}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

function RoomListItem({
  view,
  index,
  onSelect,
}: {
  view: ReturnType<typeof deriveRoomView>
  index: number
  onSelect: (room: Room) => void
}) {
  const { room, status, current, next } = view
  const style = ROOM_STATUS_STYLES[status]

  const caption = current
    ? `${current.title} · hasta ${mxTimeLabel(current.endTime)}`
    : next
      ? `Próxima ${mxTimeLabel(next.startTime)} · ${next.title}`
      : 'Disponible todo el día'

  const meta = [
    room.capacity != null ? `${room.capacity} personas` : null,
    room.building,
    room.floor,
  ].filter(Boolean)

  return (
    <li
      className="tile-enter"
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
    >
      <motion.button
        type="button"
        onClick={() => onSelect(room)}
        whileTap={{ scale: 0.985, transition: springSnappy }}
        className={`w-full rounded-2xl border-2 ${style.border} ${style.tile} px-4 py-3.5 text-left shadow-sm`}
      >
        <div className="flex items-center gap-2">
          <span className={`size-2.5 shrink-0 rounded-full ${style.dot}`} />
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink-950">
            {room.name}
          </span>
          <span
            className={`shrink-0 text-[10px] font-bold tracking-wide ${style.text}`}
          >
            {style.label}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">{caption}</p>

        {meta.length > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-400">
            <GrndIcon name="conexion" size={12} />
            {meta.join(' · ')}
          </p>
        )}
      </motion.button>
    </li>
  )
}
