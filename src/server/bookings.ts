// Server functions (createServerFn) — el único punto de contacto del cliente con Google.
// Las credenciales nunca se exponen al cliente: todo corre en el servidor.

import { createServerFn } from '@tanstack/react-start'
import { getCalendarService, isUsingMock } from '../lib/calendar-service'
import { getCurrentUser, isDomainUser } from '../lib/auth'
import { mxDayRange } from '../lib/mexico-time'
import type { BookingInput, MeetingType } from '../lib/types'

const MEETING_TYPES: MeetingType[] = ['interno', 'cliente', 'entrevista', 'otro']

/** Valida y normaliza el payload de creación de reserva. Lanza en input inválido. */
function validateBookingInput(data: unknown): BookingInput {
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
    clientName,
    // El organizer siempre proviene de la sesión del servidor, nunca del cliente.
    organizerEmail: getCurrentUser().email,
  }
}

/** Lista las salas configuradas. */
export const listRoomsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getCalendarService().listRooms()
})

/** Disponibilidad de todas las salas para hoy (CDMX). */
export const getTodayAvailabilityFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const svc = getCalendarService()
    const user = getCurrentUser()
    const rooms = await svc.listRooms()
    const range = mxDayRange()
    const [availability, bookings] = await Promise.all([
      svc.getAvailability(
        rooms.map((r) => r.resourceEmail),
        range,
        user.email,
      ),
      svc.getDayBookings(range, user.email),
    ])
    return { rooms, range, availability, bookings, usingMock: isUsingMock() }
  },
)

/** Crea una reserva. El organizer se toma de la sesión. */
export const createBookingFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => validateBookingInput(data))
  .handler(async ({ data }) => {
    const user = getCurrentUser()
    if (!isDomainUser(user.email)) {
      throw new Error('Solo usuarios del dominio de Gerundio pueden reservar.')
    }
    return getCalendarService().createBooking(data)
  })

/** Edita una reserva existente. El organizer se toma de la sesión. */
export const updateBookingFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>
    const eventId = String(d?.eventId ?? '').trim()
    if (!eventId) throw new Error('Falta el identificador de la reserva.')
    return { eventId, input: validateBookingInput(data) }
  })
  .handler(async ({ data }) => {
    const user = getCurrentUser()
    if (!isDomainUser(user.email)) {
      throw new Error('Solo usuarios del dominio de Gerundio pueden editar reservas.')
    }
    return getCalendarService().updateBooking(data.eventId, data.input)
  })

/** Cancela una reserva. */
export const cancelBookingFn = createServerFn({ method: 'POST' })
  .validator((data: { eventId: string; roomEmail: string }) => {
    if (!data?.eventId || !data?.roomEmail) throw new Error('Datos de cancelación incompletos.')
    return data
  })
  .handler(async ({ data }) => {
    const user = getCurrentUser()
    await getCalendarService().cancelBooking(data.eventId, data.roomEmail, user.email)
    return { ok: true as const }
  })

/** Reservas del usuario logueado (hoy). */
export const getMyBookingsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = getCurrentUser()
  return getCalendarService().getMyBookings(user.email, mxDayRange())
})
