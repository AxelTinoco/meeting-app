// Server functions (createServerFn) — el único punto de contacto del cliente con Google.
// Las credenciales nunca se exponen al cliente: todo corre en el servidor.

import { createServerFn } from '@tanstack/react-start'
import { getCalendarService } from '../lib/calendar-service'
import {
  NotAuthorizedError,
  canManageBooking,
  isDomainUser,
  requireUser,
} from '../lib/auth'
import { mxDayRange } from '../lib/mexico-time'
import { asRecord } from './input'
import type { BookingInput, MeetingType } from '../lib/types'

/**
 * Reserva tal como la manda el cliente: sin `organizerEmail`.
 *
 * Ese campo lo pone el handler a partir de la sesión. Si viniera del payload, cualquiera
 * podría reservar a nombre de otra persona.
 */
type BookingDraft = Omit<BookingInput, 'organizerEmail'>

const MEETING_TYPES: MeetingType[] = ['interno', 'cliente', 'entrevista', 'otro']

/** Tope defensivo: Google acepta cientos, pero una sala de juntas no necesita tantos. */
const MAX_ATTENDEES = 50

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Valida y normaliza la lista de invitados. Acepta internos y externos por igual. */
function validateAttendees(value: unknown): string[] | undefined {
  if (value == null) return undefined
  if (!Array.isArray(value)) throw new Error('Lista de invitados inválida.')

  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    const email = String(raw ?? '').trim().toLowerCase()
    if (!email) continue
    if (!EMAIL_RE.test(email)) {
      throw new Error(`"${email}" no es un correo válido.`)
    }
    if (seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  if (out.length > MAX_ATTENDEES) {
    throw new Error(`Máximo ${MAX_ATTENDEES} invitados por reserva.`)
  }
  return out.length ? out : undefined
}

/** Valida y normaliza el payload de creación de reserva. Lanza en input inválido. */
function validateBookingInput(data: unknown): BookingDraft {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Payload de reserva inválido.')
  }
  const d = data as Record<string, unknown>
  const roomEmail = String(d.roomEmail ?? '').trim()
  const title = String(d.title ?? '').trim()
  const startTime = String(d.startTime ?? '').trim()
  const endTime = String(d.endTime ?? '').trim()

  if (!roomEmail) throw new Error('Falta la sala.')
  if (!title) throw new Error('Falta el título de la reunión.')
  if (!startTime || !endTime) throw new Error('Falta el horario.')
  if (startTime >= endTime) throw new Error('La hora de fin debe ser mayor a la de inicio.')

  const meetingType =
    typeof d.meetingType === 'string' && MEETING_TYPES.includes(d.meetingType as MeetingType)
      ? (d.meetingType as MeetingType)
      : undefined

  const attendeeCount =
    d.attendeeCount != null && Number.isFinite(Number(d.attendeeCount))
      ? Number(d.attendeeCount)
      : undefined

  const clientName =
    typeof d.clientName === 'string' && d.clientName.trim()
      ? d.clientName.trim()
      : undefined

  return {
    roomEmail,
    title,
    startTime,
    endTime,
    meetingType,
    attendeeCount,
    attendees: validateAttendees(d.attendees),
    clientName,
  }
}

/** Lista las salas configuradas. */
export const listRoomsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser()
  return getCalendarService().listRooms()
})

/**
 * Datos del dashboard de hoy (CDMX): salas + reservas del día.
 *
 * Aquí se llamaba también a `getAvailability` (freebusy), pero el dashboard nunca usaba
 * ese resultado: deriva todo de `bookings`. Era un viaje extra a Google —de los lentos,
 * ver el retraso de freebusy en `assertRoomFree`— bloqueando el loader de la ruta, o sea
 * retrasando el primer pintado del mapa sin dar nada a cambio.
 */
export const getTodayAvailabilityFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const svc = getCalendarService()
    const range = mxDayRange()
    const [rooms, bookings] = await Promise.all([
      svc.listRooms(),
      svc.getDayBookings(range, user.email),
    ])
    return { rooms, range, bookings, user }
  },
)

/** Crea una reserva. El organizer se toma de la sesión. */
export const createBookingFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => validateBookingInput(data))
  .handler(async ({ data }) => {
    const user = await requireUser()
    return getCalendarService().createBooking({ ...data, organizerEmail: user.email })
  })

/**
 * Comprueba que el usuario pueda tocar la reserva y devuelve a nombre de quién hay que
 * hablarle a Google.
 *
 * El `subject` es siempre el organizador original, no quien opera: cuando un admin
 * cancela la junta de alguien más, la acción tiene que salir del calendario del dueño
 * para que se cancele de verdad y los invitados se enteren. Si el organizador no es del
 * dominio (reservas viejas, donde la organizadora es la sala) no se puede impersonar, y
 * se actúa como el propio usuario.
 */
async function authorizeBooking(
  eventId: string,
  roomEmail: string,
): Promise<{ subject: string }> {
  const user = await requireUser()
  const existing = await getCalendarService().getBooking(
    eventId,
    roomEmail,
    user.email,
  )
  if (!existing) throw new Error('La reserva ya no existe.')

  if (!canManageBooking(user, existing.organizerEmail)) {
    throw new NotAuthorizedError(
      'Esta reserva es de otra persona. Solo quien la creó (o un administrador) puede modificarla.',
    )
  }

  return {
    subject: isDomainUser(existing.organizerEmail)
      ? existing.organizerEmail
      : user.email,
  }
}

/** Edita una reserva existente. El organizer se toma de la sesión. */
export const updateBookingFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const d = asRecord(data)
    const eventId = String(d.eventId ?? '').trim()
    if (!eventId) throw new Error('Falta el identificador de la reserva.')
    return { eventId, input: validateBookingInput(data) }
  })
  .handler(async ({ data }) => {
    const { subject } = await authorizeBooking(data.eventId, data.input.roomEmail)
    return getCalendarService().updateBooking(data.eventId, {
      ...data.input,
      organizerEmail: subject,
    })
  })

/** Cancela una reserva. */
export const cancelBookingFn = createServerFn({ method: 'POST' })
  .validator((data: { eventId: string; roomEmail: string }) => {
    const d = asRecord(data)
    const eventId = String(d.eventId ?? '').trim()
    const roomEmail = String(d.roomEmail ?? '').trim()
    if (!eventId || !roomEmail) throw new Error('Datos de cancelación incompletos.')
    return { eventId, roomEmail }
  })
  .handler(async ({ data }) => {
    const { subject } = await authorizeBooking(data.eventId, data.roomEmail)
    await getCalendarService().cancelBooking(data.eventId, data.roomEmail, subject)
    return { ok: true as const }
  })

/** Reservas del usuario logueado (hoy). */
export const getMyBookingsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  return getCalendarService().getMyBookings(user.email, mxDayRange())
})
