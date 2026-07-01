import { useState } from 'react'
import { Crosshair, Minus, Plus } from 'lucide-react'
import { RoomTile } from './RoomTile'
import { RoomDetailModal } from './RoomDetailModal'
import { RoomFormModal } from './RoomFormModal'
import { deriveRoomView } from '../lib/dashboard'
import type { Booking, Room } from '../lib/types'

interface RoomMapProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date | null
  usingMock: boolean
  onChanged: () => void
}

/** Lienzo espacial con las salas colocadas según su posición en el mapa. */
export function RoomMap({ rooms, bookings, now, usingMock, onChanged }: RoomMapProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)

  // Se re-deriva de `rooms` para reflejar ediciones y cerrarse si la sala se eliminó.
  const selectedRoom = rooms.find((r) => r.resourceEmail === selectedEmail) ?? null

  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      {/* Cuadrícula de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {usingMock && (
        <div className="absolute left-6 top-6 z-10 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Modo demo · datos de prueba
        </div>
      )}

      <button
        type="button"
        onClick={() => setCreatingRoom(true)}
        className="absolute right-6 top-6 z-10 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700"
      >
        <Plus size={16} /> Nueva sala
      </button>

      <div className="absolute inset-0 p-10">
        <div className="relative h-full w-full">
          {rooms.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="rounded-xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-slate-400">
                No hay salas. Crea la primera con «Nueva sala».
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomTile
                key={room.resourceEmail}
                view={deriveRoomView(room, bookings, now)}
                onSelect={(r) => setSelectedEmail(r.resourceEmail)}
              />
            ))
          )}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ZoomButton icon={Plus} label="Acercar" />
        <ZoomButton icon={Minus} label="Alejar" />
        <ZoomButton icon={Crosshair} label="Centrar" />
      </div>

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          bookings={bookings}
          onClose={() => setSelectedEmail(null)}
          onChanged={onChanged}
        />
      )}

      {creatingRoom && (
        <RoomFormModal
          onClose={() => setCreatingRoom(false)}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}

function ZoomButton({
  icon: Icon,
  label,
}: {
  icon: typeof Plus
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-11 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
    >
      <Icon size={18} />
    </button>
  )
}
