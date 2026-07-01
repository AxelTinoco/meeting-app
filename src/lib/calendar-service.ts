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
  deleteEvent,
  listRoomEvents,
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
  async updateBooking(eventId, input) {
    // La Calendar REST API aún no está expuesta con patch aquí: reemplazamos
    // el evento (borrar + crear) usando al organizador como subject de impersonation.
    await deleteEvent(input.organizerEmail, input.roomEmail, eventId)
    return insertEvent(input)
  },
  cancelBooking(eventId, roomEmail, subject) {
    return deleteEvent(subject, roomEmail, eventId)
  },
  async getMyBookings(userEmail, range) {
    const rooms = listRoomsConfig()
    const perRoom = await Promise.all(
      rooms.map((r) => listRoomEvents(userEmail, r.resourceEmail, range)),
    )
    return perRoom
      .flat()
      .filter((b) => b.organizerEmail.toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  },
  async getDayBookings(range, subject) {
    const rooms = listRoomsConfig()
    const perRoom = await Promise.all(
      rooms.map((r) => listRoomEvents(subject, r.resourceEmail, range)),
    )
    return perRoom.flat().sort((a, b) => a.startTime.localeCompare(b.startTime))
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
