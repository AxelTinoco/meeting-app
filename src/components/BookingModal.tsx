import { useState } from 'react'
import { X } from 'lucide-react'
import { createBookingFn, updateBookingFn } from '../server/bookings'
import { mxISO, mxISODate, mxInputParts } from '../lib/mexico-time'
import type { Booking, MeetingType, Room } from '../lib/types'

interface BookingModalProps {
  room: Room
  /** Si se pasa, el modal edita esa reserva; si no, crea una nueva. */
  booking?: Booking
  onClose: () => void
  onSaved: () => void
}

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'interno', label: 'Interno' },
  { value: 'cliente', label: 'Cliente externo' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'otro', label: 'Otro' },
]

export function BookingModal({ room, booking, onClose, onSaved }: BookingModalProps) {
  const isEdit = booking != null
  const startParts = booking ? mxInputParts(booking.startTime) : null
  const endParts = booking ? mxInputParts(booking.endTime) : null

  const [title, setTitle] = useState(booking?.title ?? '')
  const [meetingType, setMeetingType] = useState<MeetingType>(
    booking?.meetingType ?? 'interno',
  )
  const [clientName, setClientName] = useState(booking?.clientName ?? '')
  const [attendeeCount, setAttendeeCount] = useState(
    booking?.attendeeCount != null ? String(booking.attendeeCount) : '',
  )
  const [date, setDate] = useState(startParts?.date ?? mxISODate())
  const [startTime, setStartTime] = useState(startParts?.time ?? '10:00')
  const [endTime, setEndTime] = useState(endParts?.time ?? '11:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overCapacity =
    room.capacity != null &&
    attendeeCount !== '' &&
    Number(attendeeCount) > room.capacity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        roomEmail: room.resourceEmail,
        title: title.trim(),
        meetingType,
        clientName: meetingType === 'cliente' ? clientName.trim() : undefined,
        attendeeCount: attendeeCount ? Number(attendeeCount) : undefined,
        startTime: mxISO(date, startTime),
        endTime: mxISO(date, endTime),
      }
      if (isEdit) {
        await updateBookingFn({ data: { ...payload, eventId: booking!.eventId } })
      } else {
        await createBookingFn({ data: payload })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No se pudo ${isEdit ? 'guardar' : 'crear'} la reserva.`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? 'Editar reserva' : 'Reservar sala'}
            </h2>
            <p className="text-sm text-slate-500">{room.name}</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Título">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Reunión con Volaris"
              className="input"
            />
          </Field>

          <Field label="Tipo de reunión">
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value as MeetingType)}
              className="input"
            >
              {MEETING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          {meetingType === 'cliente' && (
            <Field label="Cliente">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre del cliente externo"
                className="input"
              />
            </Field>
          )}

          <Field label="Fecha">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Fin">
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field
            label={`Asistentes${room.capacity ? ` (capacidad ${room.capacity})` : ''}`}
          >
            <input
              type="number"
              min={1}
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(e.target.value)}
              className="input"
            />
            {overCapacity && (
              <p className="mt-1 text-xs text-amber-600">
                Excede la capacidad de la sala (informativo).
              </p>
            )}
          </Field>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting
                ? 'Guardando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Reservar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
