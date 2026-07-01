import { Users } from 'lucide-react'
import { ROOM_STATUS_STYLES, type RoomView } from '../lib/dashboard'
import { mxTimeLabel } from '../lib/mexico-time'
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
    <button
      type="button"
      onClick={() => onSelect(room)}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
      }}
      className={`group absolute rounded-2xl border-2 ${style.border} ${style.tile} text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400/50`}
    >
      <span className="absolute -top-3.5 left-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
        <span className={`size-2 rounded-full ${style.dot}`} />
        {room.name}
        <span className={`text-[10px] font-bold tracking-wide ${style.text}`}>
          {style.label}
        </span>
      </span>

      <span className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
        <span className="truncate text-xs text-slate-500">{caption}</span>
        {room.capacity != null && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
            <Users size={12} /> {room.capacity}
          </span>
        )}
      </span>
    </button>
  )
}
