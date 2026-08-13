import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { RoomTile } from './RoomTile'
import { RoomDetailModal } from './RoomDetailModal'
import { RoomFormModal } from './RoomFormModal'
import { deriveRoomView } from '../lib/dashboard'
import { springSnappy } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'
import type { Booking, CurrentUser, Room } from '../lib/types'

interface RoomMapProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date | null
  user: CurrentUser
  onChanged: () => void
}

/** Lienzo espacial con las salas colocadas según su posición en el mapa. */
export function RoomMap({ rooms, bookings, now, user, onChanged }: RoomMapProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const isAdmin = user.role === 'admin'

  // Se re-deriva de `rooms` para reflejar ediciones y cerrarse si la sala se eliminó.
  const selectedRoom =
    rooms.find((r) => r.resourceEmail === selectedEmail) ?? null

  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      {/* Cuadrícula de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-ink-200) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ink-200) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {isAdmin && (
        <button
          type="button"
          onClick={() => setCreatingRoom(true)}
          className="btn-primary absolute right-6 top-6 z-10"
        >
          <GrndIcon name="sumando" size={16} /> Nueva sala
        </button>
      )}

      <div className="absolute inset-0 p-10">
        {/* El plano es lo primero que tiene que verse, así que su entrada no pasa
            por motion: cada sala se escalona sola con un `animation-delay` en CSS
            (ver `tile-enter`). Un contenedor de variantes aquí obligaría a las
            salas a esperar a la hidratación para hacerse visibles. */}
        <div className="relative h-full w-full">
          {rooms.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="card-empty px-6 py-8">
                No hay salas configuradas.
              </p>
            </div>
          ) : (
            rooms.map((room, i) => (
              <RoomTile
                key={room.resourceEmail}
                view={deriveRoomView(room, bookings, now)}
                index={i}
                onSelect={(r) => setSelectedEmail(r.resourceEmail)}
              />
            ))
          )}
        </div>
      </div>

      <div className="card absolute bottom-6 right-6 flex flex-col overflow-hidden">
        <ZoomButton icon="sumando" label="Acercar" />
        <ZoomButton icon="restando" label="Alejar" />
        <ZoomButton icon="enfocando" label="Centrar" />
      </div>

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          bookings={bookings}
          user={user}
          onClose={() => setSelectedEmail(null)}
          onChanged={onChanged}
        />
      )}

      <AnimatePresence>
        {creatingRoom && (
          <RoomFormModal
            key="room-create"
            onClose={() => setCreatingRoom(false)}
            onSaved={onChanged}
          />
        )}
      </AnimatePresence>
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
