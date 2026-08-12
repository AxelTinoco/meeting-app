import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { RoomTile } from './RoomTile'
import { RoomDetailModal } from './RoomDetailModal'
import { RoomFormModal } from './RoomFormModal'
import { deriveRoomView } from '../lib/dashboard'
import { springSnappy, staggerContainer } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'
import type { Booking, Room } from '../lib/types'

interface RoomMapProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date | null
  usingMock: boolean
  onChanged: () => void
}

/** Lienzo espacial con las salas colocadas según su posición en el mapa. */
export function RoomMap({
  rooms,
  bookings,
  now,
  usingMock,
  onChanged,
}: RoomMapProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)

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

      {usingMock && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
          className="chip-neon absolute left-6 top-6 z-10 bg-amarillo-200"
        >
          <span className="size-1.5 rounded-full bg-black" />
          Modo demo · datos de prueba
        </motion.div>
      )}

      <motion.button
        type="button"
        onClick={() => setCreatingRoom(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={springSnappy}
        className="btn-primary absolute right-6 top-6 z-10"
      >
        <GrndIcon name="sumando" size={16} /> Nueva sala
      </motion.button>

      <div className="absolute inset-0 p-10">
        {/* El contenedor no anima nada propio: escalona la entrada de las salas
            para que el plano se dibuje, en vez de aparecer de golpe. */}
        <motion.div
          className="relative h-full w-full"
          variants={staggerContainer(0.05)}
          initial="hidden"
          animate="visible"
        >
          {rooms.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="card-empty px-6 py-8">
                No hay salas. Crea la primera con «Nueva sala».
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {rooms.map((room) => (
                <RoomTile
                  key={room.resourceEmail}
                  view={deriveRoomView(room, bookings, now)}
                  onSelect={(r) => setSelectedEmail(r.resourceEmail)}
                />
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      <div className="card absolute bottom-6 right-6 flex flex-col overflow-hidden">
        <ZoomButton icon="sumando" label="Acercar" />
        <ZoomButton icon="restando" label="Alejar" />
        <ZoomButton icon="enfocando" label="Centrar" />
      </div>

      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailModal
            key="room-detail"
            room={selectedRoom}
            bookings={bookings}
            onClose={() => setSelectedEmail(null)}
            onChanged={onChanged}
          />
        )}
      </AnimatePresence>

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
