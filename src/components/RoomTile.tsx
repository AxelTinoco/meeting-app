import { motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { ROOM_STATUS_STYLES } from '../lib/dashboard'
import type { RoomView } from '../lib/dashboard'
import { mxTimeLabel } from '../lib/mexico-time'
import { springSnappy, tileVariants } from '../lib/motion'
import type { Room } from '../lib/types'

interface RoomTileProps {
  view: RoomView
  onSelect: (room: Room) => void
}

/** Sala flotante en el lienzo del mapa. Click → abre el panel de detalle de la sala. */
export function RoomTile({ view, onSelect }: RoomTileProps) {
  const { room, status, current, next } = view
  const style = ROOM_STATUS_STYLES[status]
  const pos = room.map ?? { x: 5, y: 5, w: 28, h: 24 }

  const caption = current
    ? `${current.title} · hasta ${mxTimeLabel(current.endTime)}`
    : next
      ? `Próxima ${mxTimeLabel(next.startTime)} · ${next.title}`
      : 'Disponible todo el día'

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(room)}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
      }}
      variants={tileVariants}
      // `initial` explícito aunque el padre ya orqueste: es lo que hace que el
      // SSR emita el estilo inicial. Sin él el HTML llega con la sala visible y
      // la hidratación la manda a opacidad 0 — un parpadeo en la primera carga.
      initial="hidden"
      exit="exit"
      // El levantar/hundir lo lleva el resorte, no `transition-all`: así el hover
      // se puede interrumpir a media animación sin que la sala «rebote» de vuelta.
      whileHover={{ y: -4, transition: springSnappy }}
      whileTap={{ scale: 0.985, transition: springSnappy }}
      className={`group absolute rounded-2xl border-2 ${style.border} ${style.tile} text-left shadow-sm transition-shadow hover:shadow-md`}
    >
      <span className="absolute -top-3.5 left-4 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-950 shadow-sm">
        <span className={`size-2 rounded-full ${style.dot}`} />
        {room.name}
        <span className={`text-[10px] font-bold tracking-wide ${style.text}`}>
          {style.label}
        </span>
      </span>

      <span className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
        <span className="truncate text-xs text-ink-500">{caption}</span>
        {room.capacity != null && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-400">
            <GrndIcon name="conexion" size={12} /> {room.capacity}
          </span>
        )}
      </span>
    </motion.button>
  )
}
