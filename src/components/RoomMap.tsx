import { motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { RoomTile } from './RoomTile'
import { deriveRoomView } from '../lib/dashboard'
import { springSnappy } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'
import type { Booking, Room } from '../lib/types'

interface RoomMapProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  onSelect: (room: Room) => void
  className?: string
}

/**
 * Lienzo espacial con las salas colocadas según su posición en el mapa.
 *
 * De `md` para arriba. La selección y los modales viven en `RoomsPanel`, que es
 * quien decide si en este ancho se enseña el plano o la lista: si el estado
 * viviera aquí, cambiar de tamaño de ventana cerraría el panel de la sala.
 */
export function RoomMap({
  rooms,
  bookings,
  now,
  onSelect,
  className = '',
}: RoomMapProps) {
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {/* Cuadrícula de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-ink-200) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ink-200) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* El padding se encoge con la pantalla: en tablet, 40px por lado se comen
          casi una sexta parte del ancho útil del plano. */}
      <div className="absolute inset-0 p-6 lg:p-10">
        {/* El plano es lo primero que tiene que verse, así que su entrada no pasa
            por motion: cada sala se escalona sola con un `animation-delay` en CSS
            (ver `tile-enter`). Un contenedor de variantes aquí obligaría a las
            salas a esperar a la hidratación para hacerse visibles. */}
        <div className="relative h-full w-full">
          {rooms.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="card-empty px-6 py-8">No hay salas configuradas.</p>
            </div>
          ) : (
            rooms.map((room, i) => (
              <RoomTile
                key={room.resourceEmail}
                view={deriveRoomView(room, bookings, now)}
                index={i}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* Sobre el hoja de agenda en tablet: `bottom` sube lo que mide su parte
          asomada para no quedar debajo. */}
      <div className="card absolute bottom-[calc(var(--sheet-peek)+1rem)] right-4 flex flex-col overflow-hidden lg:bottom-6 lg:right-6">
        <ZoomButton icon="sumando" label="Acercar" />
        <ZoomButton icon="restando" label="Alejar" />
        <ZoomButton icon="enfocando" label="Centrar" />
      </div>
    </div>
  )
}

function ZoomButton({ icon, label }: { icon: GrndIconName; label: string }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      transition={springSnappy}
      className="flex size-11 items-center justify-center text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-600"
    >
      <GrndIcon name={icon} size={18} />
    </motion.button>
  )
}
