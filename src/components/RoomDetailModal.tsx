import { useState } from 'react'
import { CalendarPlus, Pencil, Trash2, Users, X } from 'lucide-react'
import { BookingModal } from './BookingModal'
import { RoomFormModal } from './RoomFormModal'
import { ConfirmDialog } from './ConfirmDialog'
import { cancelBookingFn } from '../server/bookings'
import { deleteRoomFn } from '../server/rooms'
import { mxTimeLabel } from '../lib/mexico-time'
import type { Booking, MeetingType, Room } from '../lib/types'

interface RoomDetailModalProps {
  room: Room
  /** Todas las reservas del día (se filtran a esta sala). */
  bookings: Booking[]
  onClose: () => void
  onChanged: () => void
}

const TYPE_LABEL: Record<MeetingType, string> = {
  interno: 'Interno',
  cliente: 'Cliente',
  entrevista: 'Entrevista',
  otro: 'Otro',
}

const TYPE_BADGE: Record<MeetingType, string> = {
  interno: 'bg-violet-100 text-violet-700',
  cliente: 'bg-amber-100 text-amber-700',
  entrevista: 'bg-sky-100 text-sky-700',
  otro: 'bg-slate-100 text-slate-600',
}

/** Panel de la sala: sus reservas de hoy (editar/cancelar), nueva reserva y edición/borrado de la sala. */
export function RoomDetailModal({
  room,
  bookings,
  onClose,
  onChanged,
}: RoomDetailModalProps) {
  const [creating, setCreating] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [editingRoom, setEditingRoom] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)

  const roomBookings = bookings
    .filter((b) => b.roomEmail === room.resourceEmail)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{room.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                {room.capacity != null && (
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> {room.capacity} personas
                  </span>
                )}
                {room.building && <span>{room.building}</span>}
                {room.floor && <span>{room.floor}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Acciones de la sala */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-3">
            <button
              type="button"
              onClick={() => setEditingRoom(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Pencil size={14} /> Editar sala
            </button>
            <button
              type="button"
              onClick={() => setDeletingRoom(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={14} /> Eliminar sala
            </button>
          </div>

          {/* Lista de reservas de hoy */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Reservas de hoy
              </h3>
              <span className="text-xs text-slate-400">{roomBookings.length}</span>
            </div>

            {roomBookings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Sin reservas hoy. Esta sala está libre todo el día.
              </p>
            ) : (
              <ul className="space-y-2">
                {roomBookings.map((b) => (
                  <li
                    key={b.eventId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {b.title}
                        </p>
                        {b.meetingType && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE[b.meetingType]}`}
                          >
                            {TYPE_LABEL[b.meetingType]}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {mxTimeLabel(b.startTime)} – {mxTimeLabel(b.endTime)}
                        {b.clientName ? ` · ${b.clientName}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingBooking(b)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Editar reserva"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelTarget(b)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Cancelar reserva"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: nueva reserva */}
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              <CalendarPlus size={16} /> Nueva reserva
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modales */}
      {creating && (
        <BookingModal
          room={room}
          onClose={() => setCreating(false)}
          onSaved={onChanged}
        />
      )}

      {editingBooking && (
        <BookingModal
          room={room}
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSaved={onChanged}
        />
      )}

      {editingRoom && (
        <RoomFormModal
          room={room}
          onClose={() => setEditingRoom(false)}
          onSaved={onChanged}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancelar reserva"
          message={`Se cancelará "${cancelTarget.title}". Esta acción no se puede deshacer.`}
          confirmLabel="Cancelar reserva"
          onConfirm={async () => {
            await cancelBookingFn({
              data: {
                eventId: cancelTarget.eventId,
                roomEmail: cancelTarget.roomEmail,
              },
            })
            onChanged()
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {deletingRoom && (
        <ConfirmDialog
          title="Eliminar sala"
          message={`Se eliminará "${room.name}" y todas sus reservas. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar sala"
          onConfirm={async () => {
            await deleteRoomFn({ data: { resourceEmail: room.resourceEmail } })
            onChanged()
            onClose()
          }}
          onClose={() => setDeletingRoom(false)}
        />
      )}
    </>
  )
}
