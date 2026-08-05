import { useState } from 'react'
import { GrndIcon } from './GrndIcon'
import { AvailabilityBar } from './AvailabilityBar'
import { BookingModal } from './BookingModal'
import { isBusyNow } from '../lib/availability'
import type { BusyInterval, Room } from '../lib/types'

interface RoomCardProps {
  room: Room
  busy: BusyInterval[]
  onChanged: () => void
}

export function RoomCard({ room, busy, onChanged }: RoomCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const busyNow = isBusyNow(busy)

  return (
    <div className="card flex flex-col p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900">{room.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
            {room.capacity != null && (
              <span className="inline-flex items-center gap-1">
                <GrndIcon name="conexion" size={13} /> {room.capacity}
              </span>
            )}
            {(room.building || room.floor) && (
              <span className="inline-flex items-center gap-1">
                <GrndIcon name="target" size={13} />
                {[room.building, room.floor].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <StatusBadge busyNow={busyNow} />
      </div>

      <div className="mt-auto pt-2">
        <AvailabilityBar busy={busy} />
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="btn-primary mt-4"
      >
        <GrndIcon name="sumando" size={15} /> Reservar
      </button>

      {modalOpen && (
        <BookingModal
          room={room}
          onClose={() => setModalOpen(false)}
          onSaved={onChanged}
        />
      )}
    </div>
  )
}

function StatusBadge({ busyNow }: { busyNow: boolean }) {
  return busyNow ? (
    <span className="badge-activa">Ocupada</span>
  ) : (
    <span className="badge-libre">Libre</span>
  )
}
