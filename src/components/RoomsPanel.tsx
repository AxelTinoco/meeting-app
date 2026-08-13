import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { RoomMap } from './RoomMap'
import { RoomList } from './RoomList'
import { RoomDetailModal } from './RoomDetailModal'
import { RoomFormModal } from './RoomFormModal'
import type { Booking, CurrentUser, Room } from '../lib/types'

interface RoomsPanelProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  user: CurrentUser
  onChanged: () => void
}

/**
 * Zona principal del tablero. Escoge la representación de las salas según el
 * ancho —plano de `md` para arriba, lista debajo— y es la dueña de la selección
 * y de los modales.
 *
 * El reparto importa: plano y lista se alternan por CSS (los dos están en el
 * HTML del servidor, así que no hay que esperar a que el cliente mida la
 * ventana para pintar) pero comparten un único estado, de modo que girar el
 * teléfono o arrastrar el borde de la ventana no cierra la sala abierta ni
 * duplica el modal.
 */
export function RoomsPanel({
  rooms,
  bookings,
  now,
  user,
  onChanged,
}: RoomsPanelProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const isAdmin = user.role === 'admin'

  // Se re-deriva de `rooms` para reflejar ediciones y cerrarse si la sala se eliminó.
  const selectedRoom =
    rooms.find((r) => r.resourceEmail === selectedEmail) ?? null

  const select = (room: Room) => setSelectedEmail(room.resourceEmail)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {isAdmin && (
        // En móvil encabeza la lista y ocupa el ancho; en el plano vuelve a ser
        // una acción flotante en la esquina.
        <div className="shrink-0 px-4 pt-4 md:absolute md:right-6 md:top-6 md:z-10 md:p-0">
          <button
            type="button"
            onClick={() => setCreatingRoom(true)}
            className="btn-primary w-full md:w-auto"
          >
            <GrndIcon name="sumando" size={16} /> Nueva sala
          </button>
        </div>
      )}

      <RoomMap
        rooms={rooms}
        bookings={bookings}
        now={now}
        onSelect={select}
        className="hidden min-h-0 flex-1 md:block"
      />

      {/* El padding inferior deja ver la última sala por encima de la parte
          asomada de la agenda, que va fija sobre este scroll. */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--sheet-peek)+1rem)] md:hidden">
        <RoomList
          rooms={rooms}
          bookings={bookings}
          now={now}
          onSelect={select}
        />
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
