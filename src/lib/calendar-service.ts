// Interfaz única que consumen las server functions, implementada contra Google Calendar.
//
// Hubo un modo demo con datos en memoria; se quitó al entrar el login real, porque
// mantenía un camino en el que la app funcionaba sin credenciales ni sesión.

import { hasGoogleCredentials } from './env'
import { listRoomsConfig } from './rooms.config'
import type {
  Booking,
  BookingInput,
  DateRange,
  Room,
  RoomAvailability,
  RoomInput,
} from './types'
import {
  freebusyQuery,
  insertEvent,
  patchEvent,
  deleteEvent,
  getEvent,
  listRoomEvents,
  listMyEvents,
} from './google/calendar-api'

export interface CalendarService {
  listRooms(): Promise<Room[]>
  getAvailability(
    roomEmails: string[],
    range: DateRange,
    subject: string,
  ): Promise<RoomAvailability[]>
  createBooking(input: BookingInput): Promise<Booking>
  /** Una reserva concreta, leída como `subject`. `null` si ya no existe. */
  getBooking(
    eventId: string,
    roomEmail: string,
    subject: string,
  ): Promise<Booking | null>
  updateBooking(eventId: string, input: BookingInput): Promise<Booking>
  cancelBooking(eventId: string, roomEmail: string, subject: string): Promise<void>
  getMyBookings(userEmail: string, range: DateRange): Promise<Booking[]>
  /** Todas las reservas del rango en todas las salas (para el mapa y "Próximas"). */
  getDayBookings(range: DateRange, subject: string): Promise<Booking[]>
  /** Alta/edición/baja de salas. En modo real es roadmap (Directory API). */
  createRoom(input: RoomInput): Promise<Room>
  updateRoom(resourceEmail: string, patch: RoomInput): Promise<Room>
  deleteRoom(resourceEmail: string): Promise<void>
}

const ROOMS_NOT_SUPPORTED =
  'La gestión de salas se hace desde la Admin Console de Google (roadmap: Admin Directory API).'

const realService: CalendarService = {
  async listRooms() {
    // v1: config estática. Migrable a admin.directory.resources sin tocar los consumidores.
    return listRoomsConfig()
  },
  getAvailability(roomEmails, range, subject) {
    return freebusyQuery(subject, roomEmails, range)
  },
  createBooking(input) {
    return insertEvent(input)
  },
  getBooking(eventId, roomEmail, subject) {
    return getEvent(subject, roomEmail, eventId)
  },
  updateBooking(eventId, input) {
    // PATCH en vez de borrar+crear: conserva el id del evento y las respuestas que los
    // invitados ya hayan dado.
    return patchEvent(eventId, input)
  },
  cancelBooking(eventId, roomEmail, subject) {
    return deleteEvent(subject, roomEmail, eventId)
  },
  async getMyBookings(userEmail, range) {
    const rooms = listRoomsConfig()
    const bookings = await listMyEvents(
      userEmail,
      range,
      rooms.map((r) => r.resourceEmail),
    )
    return bookings.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  },
  async getDayBookings(range, subject) {
    const rooms = listRoomsConfig()
    const roomEmails = rooms.map((r) => r.resourceEmail)

    // Los calendarios de las salas son la fuente de verdad, pero tardan ~15s en registrar
    // una reserva nueva. Unimos el calendario del usuario para que la suya aparezca al
    // instante; si ya venía de la sala, gana esa copia (es la confirmada).
    const [perRoom, mine] = await Promise.all([
      Promise.all(roomEmails.map((email) => listRoomEvents(subject, email, range))),
      listMyEvents(subject, range, roomEmails, false),
    ])

    const byId = new Map<string, Booking>()
    for (const booking of mine) byId.set(booking.eventId, booking)
    for (const booking of perRoom.flat()) byId.set(booking.eventId, booking)

    return [...byId.values()].sort(
      (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
    )
  },
  async createRoom() {
    throw new Error(ROOMS_NOT_SUPPORTED)
  },
  async updateRoom() {
    throw new Error(ROOMS_NOT_SUPPORTED)
  },
  async deleteRoom() {
    throw new Error(ROOMS_NOT_SUPPORTED)
  },
}

/** Cliente de Calendar. Lanza si el entorno no tiene credenciales de service account. */
export function getCalendarService(): CalendarService {
  if (!hasGoogleCredentials()) {
    throw new Error(
      'Faltan credenciales de Google (GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).',
    )
  }
  return realService
}
