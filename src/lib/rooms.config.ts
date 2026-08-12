import type { Room } from './types'

/**
 * Config estática de salas para v1 (decisión: pocas salas fijas).
 *
 * Cada `resourceEmail` debe corresponder a un "recurso de calendario" dado de alta
 * en Admin Console → Directorio → Edificios y recursos. Ese email es el ID que se usa
 * en todas las llamadas a la Calendar API.
 *
 * Para migrar a lectura dinámica (admin.directory.resources.calendars.list) más adelante,
 * basta con reemplazar `listRoomsConfig()` por la llamada al Directory API.
 */
export const ROOMS: readonly Room[] = [
  {
    resourceEmail: 'c_1885ejlv5j0pqgtunb4st502sviea@resource.calendar.google.com',
    name: 'El Taller',
    capacity: 20,
    building: 'Gerundio-HQ',
    floor: 'PH',
    map: { x: 22, y: 6, w: 30, h: 26 },
  },
  {
    resourceEmail: 'c_18883h76v9ig8j7cl6seh6lpuh9qa@resource.calendar.google.com',
    name: 'La pecera',
    capacity: 8,
    building: 'Gerundio-HQ',
    floor: 'Piso 4',
    map: { x: 48, y: 40, w: 34, h: 34 },
  },
  {
    resourceEmail: 'c_1885pmjcmutt6ie4m3nem77hc0c5g@resource.calendar.google.com',
    name: 'Salita Azul',
    capacity: 6,
    building: 'Gerundio-HQ',
    floor: 'Piso 4',
    map: { x: 8, y: 66, w: 28, h: 24 },
  },
] as const

export function listRoomsConfig(): Room[] {
  return ROOMS.map((r) => ({ ...r }))
}

export function findRoom(resourceEmail: string): Room | undefined {
  return ROOMS.find((r) => r.resourceEmail === resourceEmail)
}
