// Derivaciones de presentación para el dashboard-mapa (client-safe, puras).
// Toman las reservas del día y el instante actual y producen los estados que
// pintan las salas del mapa y el panel "Próximas".

import { DAY_END_HOUR, mxDateTime, mxISODate } from './mexico-time'
import type { Booking, BookingAttendee, Room } from './types'

export type RoomStatus = 'active' | 'reserved' | 'free'

export interface RoomStatusStyle {
  label: string
  dot: string
  text: string
  tile: string
  border: string
}

/**
 * Paleta por estado, sobre los colores de marca (ver `src/styles.css`):
 * rosa = ocupada ahora, azul Gerundio = reservada más tarde, aqua = libre.
 * El punto usa el neón puro; el texto usa el paso oscuro del mismo matiz.
 */
export const ROOM_STATUS_STYLES: Record<RoomStatus, RoomStatusStyle> = {
  active: {
    label: 'ACTIVA',
    dot: 'bg-rosa-400',
    text: 'text-rosa-600',
    tile: 'bg-rosa-50/70',
    border: 'border-rosa-300',
  },
  reserved: {
    label: 'RESERVADA',
    dot: 'bg-brand-500',
    text: 'text-brand-600',
    tile: 'bg-brand-50/70',
    border: 'border-brand-300',
  },
  free: {
    label: 'LIBRE',
    dot: 'bg-aqua-300',
    text: 'text-aqua-700',
    tile: 'bg-aqua-50/70',
    border: 'border-aqua-200',
  },
}

export interface RoomView {
  room: Room
  status: RoomStatus
  /** Reunión en curso ahora mismo, si la hay. */
  current?: Booking
  /** Próxima reunión de hoy (futura), si la hay. */
  next?: Booking
  todayCount: number
}

// Las horas de reserva llevan offset -06:00 y `now` se compara en UTC: hay que
// comparar por instante real (Date.parse → ms), NUNCA por texto, o los offsets
// distintos dan resultados equivocados (una reunión futura parecería finalizada).
function isActive(b: Booking, nowMs: number): boolean {
  return Date.parse(b.startTime) <= nowMs && nowMs < Date.parse(b.endTime)
}

/**
 * Orden cronológico. Por instante y no por texto, por lo mismo que `isActive`: la
 * misma reunión vuelve de Google con offsets distintos según de qué calendario se
 * lea (la copia de la sala trae el huso del recurso, la del organizador el suyo),
 * y como texto "…T10:00:00-07:00" va DESPUÉS de "…T11:00:00-06:00" aunque sean el
 * mismo momento. Ordenar por cadena barajaba la agenda y hacía que una sala
 * anunciara como "Próxima" una reunión que no era la siguiente.
 */
function byStart(a: Booking, b: Booking): number {
  return Date.parse(a.startTime) - Date.parse(b.startTime)
}

/** Deriva el estado de una sala a partir de sus reservas de hoy y el instante actual. */
export function deriveRoomView(room: Room, bookings: Booking[], now: Date): RoomView {
  const mine = bookings
    .filter((b) => b.roomEmail === room.resourceEmail)
    .sort(byStart)

  const nowMs = now.getTime()
  const current = mine.find((b) => isActive(b, nowMs))
  const next = mine.find((b) => Date.parse(b.startTime) > nowMs)
  const status: RoomStatus = current ? 'active' : next ? 'reserved' : 'free'

  return { room, status, current, next, todayCount: mine.length }
}

export type UpcomingStatus = 'active' | 'incoming' | 'ended' | 'free'

/** Una cara de la pila de la tarjeta. */
export interface UpcomingPerson extends BookingAttendee {
  /** Quien reservó: va primero en la pila y lleva anillo de marca. */
  isOrganizer?: boolean
}

export interface UpcomingItem {
  id: string
  status: UpcomingStatus
  title: string
  roomName?: string
  start: string
  end: string
  /**
   * Quién estuvo, para la pila de avatares: el organizador primero y luego sus invitados.
   * Las tarjetas "Libre" no tienen.
   */
  people?: UpcomingPerson[]
}

/**
 * Compone las caras de una reserva.
 *
 * El organizador va incluido a propósito: `Booking.attendees` son solo los invitados, así
 * que una junta donde alguien apartó la sala sin invitar a nadie por correo —el caso más
 * común— no mostraba ninguna cara y no había forma de saber de quién era.
 */
function peopleOf(b: Booking): UpcomingPerson[] | undefined {
  const guests = b.attendees ?? []
  const { organizer } = b
  if (!organizer) return guests.length ? guests : undefined

  // `attendees` ya viene sin el organizador; el filtro es por si una reserva vieja lo
  // trajera duplicado, que se vería como dos veces la misma cara.
  const email = organizer.email.toLowerCase()
  return [
    { ...organizer, isOrganizer: true },
    ...guests.filter((a) => a.email.toLowerCase() !== email),
  ]
}

const ROOM_NAME = (rooms: Room[], email: string) =>
  rooms.find((r) => r.resourceEmail === email)?.name

/**
 * Construye la agenda del día: TODAS las reuniones de TODAS las salas ordenadas por
 * hora, marcando cada una como finalizada / en curso / próxima. Añade además (si existe)
 * el próximo hueco global sin ninguna reunión como tarjeta "Libre".
 */
export function buildUpcoming(
  bookings: Booking[],
  rooms: Room[],
  now: Date,
): UpcomingItem[] {
  const sorted = [...bookings].sort(byStart)

  const nowMs = now.getTime()
  const items: UpcomingItem[] = sorted.map((b) => ({
    id: b.eventId,
    status: isActive(b, nowMs)
      ? ('active' as const)
      : Date.parse(b.endTime) <= nowMs
        ? ('ended' as const)
        : ('incoming' as const),
    title: b.title,
    roomName: ROOM_NAME(rooms, b.roomEmail),
    start: b.startTime,
    end: b.endTime,
    people: peopleOf(b),
  }))

  const free = nextFreeSlot(sorted, now)
  if (free) items.push(free)

  return items
}

/** Primer hueco (≥30 min) desde ahora sin ninguna reunión en ninguna sala. */
function nextFreeSlot(sorted: Booking[], now: Date): UpcomingItem | null {
  // Todo se compara por instante (ms): los tiempos de reserva llevan offset -06:00
  // y `now` es UTC, así que comparar cadenas mezclaría formatos.
  const dayEndIso = mxDateTime(mxISODate(now), DAY_END_HOUR)
  const dayEndMs = Date.parse(dayEndIso)
  const nowMs = now.getTime()
  if (nowMs >= dayEndMs) return null

  // Fusiona intervalos ocupados y busca el primer gap después de ahora.
  let cursorIso = now.toISOString()
  let cursorMs = nowMs
  // `sorted` ya viene en orden cronológico real (byStart); aquí solo se descarta lo pasado.
  const future = sorted.filter((b) => Date.parse(b.endTime) > nowMs)

  for (const b of future) {
    const bStartMs = Date.parse(b.startTime)
    if (bStartMs > cursorMs) {
      // Hay hueco entre cursor y el inicio de esta reunión.
      const gapEndIso = bStartMs < dayEndMs ? b.startTime : dayEndIso
      if (Date.parse(gapEndIso) - cursorMs >= 30 * 60 * 1000) {
        return freeItem(cursorIso, gapEndIso)
      }
    }
    const bEndMs = Date.parse(b.endTime)
    if (bEndMs > cursorMs) {
      cursorMs = bEndMs
      cursorIso = b.endTime
    }
    if (cursorMs >= dayEndMs) return null
  }

  if (cursorMs < dayEndMs && dayEndMs - cursorMs >= 30 * 60 * 1000) {
    return freeItem(cursorIso, dayEndIso)
  }
  return null
}

function freeItem(start: string, end: string): UpcomingItem {
  // El id es fijo a propósito: es la `key` de la tarjeta en el riel y el hueco empieza
  // "ahora", que cambia en cada tick del reloj. Con un id derivado de `start` la tarjeta
  // se desmontaba y volvía a montar cada segundo, así que vivía en plena animación de
  // entrada/salida (parpadeo). Con un id estable solo se actualiza el rango.
  return { id: 'free-slot', status: 'free', title: 'Sin reuniones', start, end }
}
