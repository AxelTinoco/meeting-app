// Server functions para el CRUD de salas.
//
// Hoy el servicio de Calendar lanza en las tres: dar de alta un recurso es Admin
// Directory API y sigue siendo roadmap. Se conservan para que la ruta exista cuando se
// implemente; mientras tanto las salas se administran desde la Admin Console.

import { createServerFn } from '@tanstack/react-start'
import { getCalendarService } from '../lib/calendar-service'
import { requireAdmin } from '../lib/auth'
import { asRecord } from './input'
import type { RoomInput } from '../lib/types'

/** Valida y normaliza el payload de una sala. Lanza en input inválido. */
function validateRoomInput(data: unknown): RoomInput {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Payload de sala inválido.')
  }
  const d = data as Record<string, unknown>
  const name = String(d.name ?? '').trim()
  if (!name) throw new Error('La sala necesita un nombre.')

  const capacity =
    d.capacity != null && Number.isFinite(Number(d.capacity)) && Number(d.capacity) > 0
      ? Math.floor(Number(d.capacity))
      : undefined

  const building =
    typeof d.building === 'string' && d.building.trim() ? d.building.trim() : undefined
  const floor =
    typeof d.floor === 'string' && d.floor.trim() ? d.floor.trim() : undefined

  return { name, capacity, building, floor }
}

/** Crea una sala. */
export const createRoomFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => validateRoomInput(data))
  .handler(async ({ data }) => {
    await requireAdmin()
    return getCalendarService().createRoom(data)
  })

/** Edita una sala existente. */
export const updateRoomFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const d = asRecord(data)
    const resourceEmail = String(d.resourceEmail ?? '').trim()
    if (!resourceEmail) throw new Error('Falta la sala a editar.')
    return { resourceEmail, patch: validateRoomInput(data) }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    return getCalendarService().updateRoom(data.resourceEmail, data.patch)
  })

/** Elimina una sala (y en cascada sus reservas). */
export const deleteRoomFn = createServerFn({ method: 'POST' })
  .validator((data: { resourceEmail: string }) => {
    const resourceEmail = String(asRecord(data).resourceEmail ?? '').trim()
    if (!resourceEmail) throw new Error('Falta la sala a eliminar.')
    return { resourceEmail }
  })
  .handler(async ({ data }) => {
    await requireAdmin()
    await getCalendarService().deleteRoom(data.resourceEmail)
    return { ok: true as const }
  })
