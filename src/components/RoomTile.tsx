import { motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { ROOM_STATUS_STYLES } from '../lib/dashboard'
import type { RoomView } from '../lib/dashboard'
import { mxTimeLabel } from '../lib/mexico-time'
import { springSnappy } from '../lib/motion'
import type { Room } from '../lib/types'

interface RoomTileProps {
  view: RoomView
  /** Posición en el mapa; solo sirve para escalonar la entrada. */
  index: number
  onSelect: (room: Room) => void
}

/** Milisegundos de retraso entre una sala y la siguiente al entrar. */
const STAGGER_MS = 50

/** Sala flotante en el lienzo del mapa. Click → abre el panel de detalle de la sala. */
export function RoomTile({ view, index, onSelect }: RoomTileProps) {
  const { room, status, current, next } = view
  const style = ROOM_STATUS_STYLES[status]
  const pos = room.map ?? { x: 5, y: 5, w: 28, h: 24 }

  const caption = current
    ? `${current.title} · hasta ${mxTimeLabel(current.endTime)}`
    : next
      ? `Próxima ${mxTimeLabel(next.startTime)} · ${next.title}`
      : 'Disponible todo el día'

  // Toda la sala es un solo botón, así que su nombre accesible es lo que haya
  // dentro concatenado sin separación: "El TallerACTIVARevisión de campaña ·
  // hasta 13:0020". Se compone a mano para que se lea (A-08). El estado va en
  // palabras porque en la pantalla lo lleva el color del borde y del punto.
  const etiqueta = [
    room.name,
    style.label.toLowerCase(),
    caption,
    room.capacity != null ? `capacidad ${room.capacity}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    // La entrada la lleva el envoltorio en CSS (`tile-enter`, ver styles.css) y no
    // motion: así la sala se pinta con el HTML del servidor en vez de esperar a que
    // hidrate el bundle. El envoltorio y el botón se reparten el trabajo porque una
    // animación CSS gana sobre el estilo inline, y si compartieran elemento su
    // `transform` final pisaría el del hover.
    <div
      className="tile-enter absolute"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
        animationDelay: `${index * STAGGER_MS}ms`,
      }}
    >
      <motion.button
        type="button"
        aria-label={etiqueta}
        onClick={() => onSelect(room)}
        // El levantar/hundir lo lleva el resorte, no `transition-all`: así el hover
        // se puede interrumpir a media animación sin que la sala «rebote» de vuelta.
        whileHover={{ y: -4, transition: springSnappy }}
        whileTap={{ scale: 0.985, transition: springSnappy }}
        className={`group relative h-full w-full rounded-2xl border-2 ${style.border} ${style.tile} text-left shadow-sm transition-shadow hover:shadow-md`}
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
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-500">
              <GrndIcon name="conexion" size={12} /> {room.capacity}
            </span>
          )}
        </span>
      </motion.button>
    </div>
  )
}
