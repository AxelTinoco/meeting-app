// Derivaciones de presentación para el dashboard-mapa (client-safe, puras).
// Toman las reservas del día y el instante actual y producen los estados que
// pintan las salas del mapa y el panel "Próximas".

import { DAY_END_HOUR, mxDateTime, mxISODate } from './mexico-time'
import type { Booking, Room } from './types'

export type RoomStatus = 'active' | 'reserved' | 'free'

export interface RoomStatusStyle {
  label: string
  dot: string
  text: string
  tile: string
  border: string
}

/** Paleta por estado (mismos tonos que el diseño: violeta / verde / neutro). */
export const ROOM_STATUS_STYLES: Record<RoomStatus, RoomStatusStyle> = {
  active: {
    label: 'ACTIVA',
    dot: 'bg-violet-500',
    text: 'text-violet-600',
    tile: 'bg-violet-50/70',
    border: 'border-violet-300',
  },
  reserved: {
    label: 'RESERVADA',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    tile: 'bg-emerald-50/70',
    border: 'border-emerald-300',
  },
  free: {
    label: 'LIBRE',
    dot: 'bg-slate-400',
    text: 'text-slate-400',
    tile: 'bg-slate-50/70',
    border: 'border-slate-200',
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

/** Deriva el estado de una sala a partir de sus reservas de hoy y el instante actual. */
export function deriveRoomView(
  room: Room,
  bookings: Booking[],
  now: Date | null,
): RoomView {
  const mine = bookings
    .filter((b) => b.roomEmail === room.resourceEmail)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (now == null) {
    // Pre-hidratación: estado estable sin depender del reloj del cliente.
    return {
      room,
      status: mine.length > 0 ? 'reserved' : 'free',
      next: mine[0],
      todayCount: mine.length,
    }
  }

  const nowMs = now.getTime()
  const current = mine.find((b) => isActive(b, nowMs))
  const next = mine.find((b) => Date.parse(b.startTime) > nowMs)
  const status: RoomStatus = current ? 'active' : next ? 'reserved' : 'free'

  return { room, status, current, next, todayCount: mine.length }
}

export type UpcomingStatus = 'active' | 'incoming' | 'ended' | 'free'

export interface UpcomingItem {
  id: string
  status: UpcomingStatus
  title: string
  roomName?: string
  start: string
  end: string
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
  now: Date | null,
): UpcomingItem[] {
  const sorted = [...bookings].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (now == null) {
    // Pre-hidratación: agenda estable sin depender del reloj del cliente.
    return sorted.map((b) => ({
      id: b.eventId,
      status: 'incoming' as const,
      title: b.title,
      roomName: ROOM_NAME(rooms, b.roomEmail),
      start: b.startTime,
      end: b.endTime,
    }))
  }

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
  const future = sorted
    .filter((b) => Date.parse(b.endTime) > nowMs)
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))

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
  return { id: `free-${start}`, status: 'free', title: 'Sin reuniones', start, end }
}
