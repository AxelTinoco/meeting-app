import { useState } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ModalShell, ModalTitle } from './ModalShell'
import { createBookingFn, updateBookingFn } from '../server/bookings'
import { AttendeesInput } from './AttendeesInput'
import { Field } from './Field'
import { TimeInput } from './TimeInput'
import {
  mxISO,
  mxISODate,
  mxInputParts,
  mxMinutesOfTime,
  mxSuggestedStart,
  mxTimeFromMinutes,
} from '../lib/mexico-time'
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

/** Fin sugerido: una hora después del inicio. */
function nextSlot(startHHMM: string): string {
  return mxTimeFromMinutes(mxMinutesOfTime(startHHMM) + 60)
}

export function BookingModal({
  room,
  booking,
  onClose,
  onSaved,
}: BookingModalProps) {
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
  const [attendees, setAttendees] = useState<string[]>(
    booking?.attendees?.map((a) => a.email) ?? [],
  )
  const initialDate = startParts?.date ?? mxISODate()
  const initialStart = startParts?.time ?? mxSuggestedStart(initialDate)
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(initialStart)
  const [endTime, setEndTime] = useState(endParts?.time ?? nextSlot(initialStart))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al cambiar de día proponemos la siguiente hora en punto si es hoy;
  // en la reserva que se edita respetamos la hora que ya tenía.
  function handleDateChange(nextDate: string) {
    setDate(nextDate)
    if (isEdit) return
    const suggested = mxSuggestedStart(nextDate)
    if (mxMinutesOfTime(startTime) < mxMinutesOfTime(suggested)) {
      setStartTime(suggested)
      setEndTime(nextSlot(suggested))
    }
  }

  // El fin siempre va después del inicio: si el usuario mueve el inicio por
  // delante del fin, lo empujamos una hora más tarde.
  function handleStartChange(nextStart: string) {
    setStartTime(nextStart)
    if (mxMinutesOfTime(endTime) <= mxMinutesOfTime(nextStart)) {
      setEndTime(nextSlot(nextStart))
    }
  }

  // Gente en la sala: el organizador más los invitados, o el número que se haya escrito
  // a mano si es mayor (juntas donde el cliente trae gente que no se invita por correo).
  const headcount = Math.max(
    attendees.length + 1,
    attendeeCount === '' ? 0 : Number(attendeeCount),
  )
  const overCapacity = room.capacity != null && headcount > room.capacity

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mxMinutesOfTime(endTime) <= mxMinutesOfTime(startTime)) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        roomEmail: room.resourceEmail,
        title: title.trim(),
        meetingType,
        clientName: meetingType === 'cliente' ? clientName.trim() : undefined,
        attendeeCount: attendeeCount ? Number(attendeeCount) : undefined,
        attendees,
        startTime: mxISO(date, startTime),
        endTime: mxISO(date, endTime),
      }
      if (isEdit) {
        await updateBookingFn({
          data: { ...payload, eventId: booking.eventId },
        })
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
    <ModalShell
      onClose={onClose}
      overlayClassName="z-50"
      panelClassName="max-w-md p-6"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <ModalTitle className="text-lg font-semibold text-ink-900">
            {isEdit ? 'Editar reserva' : 'Reservar sala'}
          </ModalTitle>
          <p className="text-sm text-ink-500">{room.name}</p>
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

        {/* El campo aparece al elegir "Cliente externo": se despliega en alto
              para que el resto del formulario no salte de golpe. */}
        <AnimatePresence initial={false}>
          {meetingType === 'cliente' && (
            <motion.div
              key="cliente"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <Field label="Cliente">
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre del cliente externo"
                  className="input"
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Fecha">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio">
            <TimeInput required value={startTime} onChange={handleStartChange} />
          </Field>
          <Field label="Fin">
            <TimeInput required value={endTime} onChange={setEndTime} />
          </Field>
        </div>

        <Field label="Invitar a">
          <AttendeesInput value={attendees} onChange={setAttendees} />
        </Field>

        <Field
          label={`Personas en la sala${room.capacity ? ` (capacidad ${room.capacity})` : ''}`}
          hint={
            overCapacity ? (
              // Aviso, no error: la reserva se puede hacer igual, así que no va
              // por `error` (que marcaría el campo como inválido).
              <span className="text-amarillo-700">
                {headcount} personas exceden la capacidad de la sala
                (informativo).
              </span>
            ) : (
              'Opcional. Úsalo si van más personas de las que invitaste por correo.'
            )
          }
        >
          <input
            type="number"
            min={1}
            value={attendeeCount}
            onChange={(e) => setAttendeeCount(e.target.value)}
            placeholder={String(attendees.length + 1)}
            className="input"
          />
        </Field>

        {/* `role="alert"`: el mensaje aparece al enviar, y sin región viva quien
            no ve la pantalla solo percibe que el modal no se cerró (A-04). */}
        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? 'Guardando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Reservar'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
