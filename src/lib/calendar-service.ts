// Interfaz única que consumen las server functions, con dos implementaciones:
//   - real:  Google Calendar (cuando hay credenciales de service account)
//   - mock:  datos en memoria (default para desarrollo sin credenciales)
//
// Cambiar entre ambas es transparente: `getCalendarService()` elige según el entorno.

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
  listRoomEvents,
  listMyEvents,
} from './google/calendar-api'
import { mockService } from './mock/mock-service'

export interface CalendarService {
  listRooms(): Promise<Room[]>
  getAvailability(
    roomEmails: string[],
    range: DateRange,
    subject: string,
  ): Promise<RoomAvailability[]>
  createBooking(input: BookingInput): Promise<Booking>
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
  'La gestión de salas todavía no está disponible con Google (roadmap: Admin Directory API). Disponible en modo demo.'

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

/** Devuelve la implementación real si hay credenciales, o el mock en caso contrario. */
export function getCalendarService(): CalendarService {
  return hasGoogleCredentials() ? realService : mockService
}

/** true si estamos operando con datos mock (útil para mostrar un banner en la UI). */
export function isUsingMock(): boolean {
  return !hasGoogleCredentials()
}
