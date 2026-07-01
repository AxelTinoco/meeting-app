// Implementación mock del CalendarService: datos en memoria, sin tocar Google.
//
// Se usa por default cuando no hay credenciales. El estado vive a nivel de módulo, así que
// las salas y reservas creadas persisten dentro de una misma instancia del worker/dev server
// (best-effort). Reinicia al reiniciar el servidor: es intencional para desarrollo.

import { listRoomsConfig, ROOMS } from '../rooms.config'
import { mxISODate, mxDateTime } from '../mexico-time'
import type {
  Booking,
  BookingInput,
  Room,
  RoomAvailability,
  RoomInput,
  RoomMapPosition,
} from '../types'
import type { CalendarService } from '../calendar-service'

// Copia mutable: en la demo las salas se crean/editan/eliminan en memoria.
const rooms: Room[] = listRoomsConfig()
const bookings: Booking[] = []
let seeded = false
let idCounter = 0

function nextId(): string {
  idCounter += 1
  return `mock-${idCounter}`
}

/** Siembra reservas deterministas para "hoy" para que la grilla no esté vacía. */
function ensureSeed(): void {
  if (seeded) return
  seeded = true

  const today = mxISODate()
  const [volcanes, cenote, desierto] = ROOMS

  const seeds: Array<{
    room: string
    title: string
    start: [number, number]
    end: [number, number]
    booking: Partial<Booking>
  }> = [
    {
      room: volcanes.resourceEmail,
      title: 'Daily Standup',
      start: [9, 0],
      end: [9, 30],
      booking: { meetingType: 'interno', organizerEmail: 'demo@gerundio.mx' },
    },
    {
      room: volcanes.resourceEmail,
      title: 'Reunión con Volaris',
      start: [13, 0],
      end: [14, 0],
      booking: {
        meetingType: 'cliente',
        clientName: 'Volaris',
        attendeeCount: 6,
        organizerEmail: 'demo@gerundio.mx',
      },
    },
    {
      room: cenote.resourceEmail,
      title: 'Entrevista — Diseñador UX',
      start: [11, 0],
      end: [12, 0],
      booking: { meetingType: 'entrevista', organizerEmail: 'ana@gerundio.mx' },
    },
    {
      room: desierto.resourceEmail,
      title: 'Planning Q3',
      start: [16, 0],
      end: [17, 30],
      booking: { meetingType: 'interno', organizerEmail: 'demo@gerundio.mx' },
    },
  ]

  for (const s of seeds) {
    bookings.push({
      eventId: nextId(),
      roomEmail: s.room,
      title: s.title,
      startTime: mxDateTime(today, s.start[0], s.start[1]),
      endTime: mxDateTime(today, s.end[0], s.end[1]),
      organizerEmail: s.booking.organizerEmail ?? 'demo@gerundio.mx',
      clientName: s.booking.clientName,
      meetingType: s.booking.meetingType,
      attendeeCount: s.booking.attendeeCount,
    })
  }
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Deriva un resourceEmail único a partir del nombre de la sala (ej. "Sala Bosque" → sala-bosque@gerundio.mx). */
function deriveRoomEmail(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quita acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sala'
  let email = `${base}@gerundio.mx`
  let n = 2
  while (rooms.some((r) => r.resourceEmail === email)) {
    email = `${base}-${n}@gerundio.mx`
    n += 1
  }
  return email
}

/** Coloca una sala nueva en una celda libre del mapa (grilla 3×n). */
function nextMapPosition(): RoomMapPosition {
  const i = rooms.length
  const cols = 3
  const col = i % cols
  const row = Math.floor(i / cols)
  return { x: 5 + col * 32, y: 6 + (row % 3) * 31, w: 27, h: 24 }
}

function normalizeRoomPatch(patch: RoomInput): Omit<Room, 'resourceEmail' | 'map'> {
  return {
    name: patch.name.trim(),
    capacity:
      patch.capacity != null && Number.isFinite(patch.capacity) && patch.capacity > 0
        ? patch.capacity
        : undefined,
    building: patch.building?.trim() || undefined,
    floor: patch.floor?.trim() || undefined,
  }
}

export const mockService: CalendarService = {
  async listRooms() {
    return rooms.map((r) => ({ ...r }))
  },

  async createRoom(input: RoomInput): Promise<Room> {
    const name = input.name.trim()
    if (!name) throw new Error('La sala necesita un nombre.')
    const room: Room = {
      resourceEmail: deriveRoomEmail(name),
      ...normalizeRoomPatch(input),
      map: nextMapPosition(),
    }
    rooms.push(room)
    return { ...room }
  },

  async updateRoom(resourceEmail: string, patch: RoomInput): Promise<Room> {
    const room = rooms.find((r) => r.resourceEmail === resourceEmail)
    if (!room) throw new Error('La sala ya no existe.')
    if (!patch.name.trim()) throw new Error('La sala necesita un nombre.')
    Object.assign(room, normalizeRoomPatch(patch))
    return { ...room }
  },

  async deleteRoom(resourceEmail: string): Promise<void> {
    const idx = rooms.findIndex((r) => r.resourceEmail === resourceEmail)
    if (idx < 0) throw new Error('La sala ya no existe.')
    rooms.splice(idx, 1)
    // Cascada: elimina las reservas de esa sala.
    for (let i = bookings.length - 1; i >= 0; i -= 1) {
      if (bookings[i].roomEmail === resourceEmail) bookings.splice(i, 1)
    }
  },

  async getAvailability(roomEmails, range): Promise<RoomAvailability[]> {
    ensureSeed()
    return roomEmails.map((roomEmail) => ({
      roomEmail,
      busy: bookings
        .filter(
          (b) =>
            b.roomEmail === roomEmail &&
            overlaps(b.startTime, b.endTime, range.timeMin, range.timeMax),
        )
        .map((b) => ({ start: b.startTime, end: b.endTime })),
    }))
  },

  async createBooking(input: BookingInput): Promise<Booking> {
    ensureSeed()
    const conflict = bookings.find(
      (b) =>
        b.roomEmail === input.roomEmail &&
        overlaps(input.startTime, input.endTime, b.startTime, b.endTime),
    )
    if (conflict) {
      throw new Error(
        `La sala ya está reservada en ese horario ("${conflict.title}").`,
      )
    }
    const booking: Booking = {
      eventId: nextId(),
      roomEmail: input.roomEmail,
      title: input.title,
      clientName: input.clientName,
      meetingType: input.meetingType,
      attendeeCount: input.attendeeCount,
      startTime: input.startTime,
      endTime: input.endTime,
      organizerEmail: input.organizerEmail,
    }
    bookings.push(booking)
    return booking
  },

  async updateBooking(eventId: string, input: BookingInput): Promise<Booking> {
    ensureSeed()
    const idx = bookings.findIndex((b) => b.eventId === eventId)
    if (idx < 0) throw new Error('La reserva ya no existe.')
    const conflict = bookings.find(
      (b) =>
        b.eventId !== eventId &&
        b.roomEmail === input.roomEmail &&
        overlaps(input.startTime, input.endTime, b.startTime, b.endTime),
    )
    if (conflict) {
      throw new Error(
        `La sala ya está reservada en ese horario ("${conflict.title}").`,
      )
    }
    const updated: Booking = {
      ...bookings[idx],
      roomEmail: input.roomEmail,
      title: input.title,
      clientName: input.clientName,
      meetingType: input.meetingType,
      attendeeCount: input.attendeeCount,
      startTime: input.startTime,
      endTime: input.endTime,
    }
    bookings[idx] = updated
    return { ...updated }
  },

  async cancelBooking(eventId: string): Promise<void> {
    const idx = bookings.findIndex((b) => b.eventId === eventId)
    if (idx >= 0) bookings.splice(idx, 1)
  },

  async getMyBookings(userEmail, range): Promise<Booking[]> {
    ensureSeed()
    return bookings
      .filter(
        (b) =>
          b.organizerEmail.toLowerCase() === userEmail.toLowerCase() &&
          overlaps(b.startTime, b.endTime, range.timeMin, range.timeMax),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  },

  async getDayBookings(range): Promise<Booking[]> {
    ensureSeed()
    return bookings
      .filter((b) => overlaps(b.startTime, b.endTime, range.timeMin, range.timeMax))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  },
}
