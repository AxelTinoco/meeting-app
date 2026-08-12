import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { GrndIcon } from './GrndIcon'
import { BookingModal } from './BookingModal'
import { RoomFormModal } from './RoomFormModal'
import { ConfirmDialog } from './ConfirmDialog'
import { cancelBookingFn } from '../server/bookings'
import { deleteRoomFn } from '../server/rooms'
import { mxTimeLabel } from '../lib/mexico-time'
import { canManageBooking } from '../lib/permissions'
import type {
  AttendeeResponse,
  Booking,
  BookingAttendee,
  CurrentUser,
  MeetingType,
  Room,
} from '../lib/types'

interface RoomDetailModalProps {
  room: Room
  /** Todas las reservas del día (se filtran a esta sala). */
  bookings: Booking[]
  user: CurrentUser
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
  interno: 'badge-reservada',
  cliente: 'badge-aviso',
  entrevista: 'badge-info',
  otro: 'badge-neutral',
}

const RESPONSE_LABEL: Record<AttendeeResponse, string> = {
  accepted: 'Aceptó',
  declined: 'No asistirá',
  tentative: 'Quizá',
  needsAction: 'Sin responder',
}

const RESPONSE_BADGE: Record<AttendeeResponse, string> = {
  accepted: 'badge-libre',
  declined: 'badge-activa',
  tentative: 'badge-info',
  needsAction: 'badge-neutral',
}

/** Los del equipo se muestran por su usuario; los externos con el correo completo. */
function attendeeLabel(a: BookingAttendee): string {
  return a.displayName ?? (a.external ? a.email : a.email.split('@')[0])
}

/** Panel de la sala: sus reservas de hoy (editar/cancelar), nueva reserva y edición/borrado de la sala. */
export function RoomDetailModal({
  room,
  bookings,
  user,
  onClose,
  onChanged,
}: RoomDetailModalProps) {
  const [creating, setCreating] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [editingRoom, setEditingRoom] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)

  const isAdmin = user.role === 'admin'

  // Por hora real y no por string: los calendarios de las salas devuelven cada uno su
  // propio offset, así que comparar el ISO como texto desordena la lista.
  const roomBookings = bookings
    .filter((b) => b.roomEmail === room.resourceEmail)
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))

  return (
    <>
      <div className="modal-overlay z-50" onClick={onClose}>
        <div
          className="modal-panel flex max-h-[85vh] max-w-lg flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-ink-100 p-6">
            <div>
              <h2 className="text-xl font-bold text-ink-900">{room.name}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                {room.capacity != null && (
                  <span className="inline-flex items-center gap-1">
                    <GrndIcon name="conexion" size={14} /> {room.capacity} personas
                  </span>
                )}
                {room.building && <span>{room.building}</span>}
                {room.floor && <span>{room.floor}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Acciones de la sala: solo admins */}
          {isAdmin && (
            <div className="flex items-center gap-2 border-b border-ink-100 px-6 py-3">
              <button
                type="button"
                onClick={() => setEditingRoom(true)}
                className="btn-secondary px-3 py-1.5"
              >
                <GrndIcon name="transformando" size={14} /> Editar sala
              </button>
              <button
                type="button"
                onClick={() => setDeletingRoom(true)}
                className="btn-danger-outline px-3 py-1.5"
              >
                <Trash2 size={14} /> Eliminar sala
              </button>
            </div>
          )}

          {/* Lista de reservas de hoy */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700">
                Reservas de hoy
              </h3>
              <span className="text-xs text-ink-400">
                {roomBookings.length}
              </span>
            </div>

            {roomBookings.length === 0 ? (
              <p className="card-empty px-4 py-8">
                Sin reservas hoy. Esta sala está libre todo el día.
              </p>
            ) : (
              <ul className="space-y-2">
                {roomBookings.map((b) => (
                  <li
                    key={b.eventId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {b.title}
                        </p>
                        {b.meetingType && (
                          <span
                            className={`shrink-0 ${TYPE_BADGE[b.meetingType]}`}
                          >
                            {TYPE_LABEL[b.meetingType]}
                          </span>
                        )}
                        {b.roomResponse === 'needsAction' && (
                          <span
                            className="badge-aviso shrink-0"
                            title="Google todavía no confirma la sala. Suele tardar unos segundos."
                          >
                            Confirmando sala…
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {mxTimeLabel(b.startTime)} – {mxTimeLabel(b.endTime)}
                        {b.clientName ? ` · ${b.clientName}` : ''}
                      </p>
                      {b.attendees?.length ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {b.attendees.map((a) => (
                            <span
                              key={a.email}
                              className={RESPONSE_BADGE[a.response]}
                              title={`${a.email} — ${RESPONSE_LABEL[a.response]}${a.external ? ' (externo)' : ''}`}
                            >
                              {a.external ? '↗ ' : ''}
                              {attendeeLabel(a)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {/* Editar/cancelar solo lo propio (o cualquier cosa si eres admin).
                        El servidor vuelve a comprobarlo: esto es solo la UI. */}
                    {canManageBooking(user, b.organizerEmail) && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingBooking(b)}
                          className="btn-icon"
                          aria-label="Editar reserva"
                        >
                          <GrndIcon name="transformando" size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(b)}
                          className="btn-icon-danger"
                          aria-label="Cancelar reserva"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: nueva reserva */}
          <div className="border-t border-ink-100 p-4">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary w-full"
            >
              <GrndIcon name="sumando" size={16} /> Nueva reserva
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
          message={
            `Se cancelará "${cancelTarget.title}". Esta acción no se puede deshacer.` +
            (cancelTarget.attendees?.length
              ? ` Se avisará por correo a ${cancelTarget.attendees.length} invitado(s).`
              : '')
          }
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
