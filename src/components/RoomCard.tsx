import { useState } from 'react'
import { Users, MapPin, CalendarPlus } from 'lucide-react'
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
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{room.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {room.capacity != null && (
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {room.capacity}
              </span>
            )}
            {(room.building || room.floor) && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} />
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
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        <CalendarPlus size={15} /> Reservar
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
    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-700">
      Ocupada
    </span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      Libre
    </span>
  )
}
