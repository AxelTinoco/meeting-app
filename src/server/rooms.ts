// Server functions para el CRUD de salas.
//
// En modo demo (mock) las salas viven en memoria y se pueden crear/editar/eliminar.
// Con credenciales reales de Google esto lanza (roadmap: Admin Directory API).

import { createServerFn } from '@tanstack/react-start'
import { getCalendarService } from '../lib/calendar-service'
import { getCurrentUser, isDomainUser } from '../lib/auth'
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

/** Verifica que quien opera pertenezca al dominio (misma regla que las reservas). */
function assertDomainUser(): void {
  const user = getCurrentUser()
  if (!isDomainUser(user.email)) {
    throw new Error('Solo usuarios del dominio de Gerundio pueden gestionar salas.')
  }
}

/** Crea una sala. */
export const createRoomFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => validateRoomInput(data))
  .handler(async ({ data }) => {
    assertDomainUser()
    return getCalendarService().createRoom(data)
  })

/** Edita una sala existente. */
export const updateRoomFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const d = data as Record<string, unknown>
    const resourceEmail = String(d?.resourceEmail ?? '').trim()
    if (!resourceEmail) throw new Error('Falta la sala a editar.')
    return { resourceEmail, patch: validateRoomInput(data) }
  })
  .handler(async ({ data }) => {
    assertDomainUser()
    return getCalendarService().updateRoom(data.resourceEmail, data.patch)
  })

/** Elimina una sala (y en cascada sus reservas). */
export const deleteRoomFn = createServerFn({ method: 'POST' })
  .validator((data: { resourceEmail: string }) => {
    const resourceEmail = String(data?.resourceEmail ?? '').trim()
    if (!resourceEmail) throw new Error('Falta la sala a eliminar.')
    return { resourceEmail }
  })
  .handler(async ({ data }) => {
    assertDomainUser()
    await getCalendarService().deleteRoom(data.resourceEmail)
    return { ok: true as const }
  })
