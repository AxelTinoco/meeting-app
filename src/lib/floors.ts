// Agrupa las salas por piso y les da un orden vertical, que es lo único que el
// mapa 3D necesita y que `room.floor` no trae.

import type { Room } from './types'

/**
 * Las plantas del edificio, de abajo hacia arriba.
 *
 * Es una lista y no un número dentro de cada sala porque el piso ya vive en
 * `room.floor` ("Piso 4", "PH"): lo que le falta a ese dato no es identidad, es
 * orden — y el orden es del edificio, no de la sala.
 *
 * Es también el censo de plantas, no solo su orden: el mapa 3D dibuja el edificio
 * entero, así que un piso donde hoy no hay salas se sigue dibujando. Sin eso, el
 * Piso 4 y el PH salían pegados y el edificio parecía de dos plantas.
 */
export const FLOOR_ORDER = [
  'Piso 1',
  'Piso 2',
  'Piso 3',
  'Piso 4',
  'PH',
] as const

/** Grupo al que caen las salas que todavía no declaran piso. */
export const SIN_PISO = 'Sin piso'

export interface FloorGroup {
  /** Etiqueta tal cual la lee una persona ("Piso 4", "PH"). */
  name: string
  /** 0 = losa de más abajo. Es la posición en la pila, no el número real del piso. */
  level: number
  rooms: Room[]
}

/**
 * Las plantas del edificio de abajo hacia arriba, cada una con sus salas.
 *
 * Devuelve SIEMPRE las cinco de `FLOOR_ORDER`, tengan salas o no: lo que se dibuja
 * es el edificio, y un piso sin salas sigue siendo un piso.
 *
 * Un piso que no esté en `FLOOR_ORDER` tampoco se cae del mapa: se apila encima de
 * los conocidos. Una sala nueva con un piso sin registrar aparece —arriba de todo y
 * fuera de sitio— en vez de desaparecer sin que nadie se entere.
 */
export function groupRoomsByFloor(rooms: Room[]): FloorGroup[] {
  const byName = new Map<string, Room[]>()
  for (const name of FLOOR_ORDER) byName.set(name, [])

  for (const room of rooms) {
    const name = room.floor?.trim() || SIN_PISO
    const group = byName.get(name)
    if (group) group.push(room)
    else byName.set(name, [room])
  }

  return [...byName.entries()]
    .sort(([a], [b]) => floorRank(a) - floorRank(b) || a.localeCompare(b))
    .map(([name, floorRooms], level) => ({ name, level, rooms: floorRooms }))
}

function floorRank(name: string): number {
  const i = (FLOOR_ORDER as readonly string[]).indexOf(name)
  return i === -1 ? FLOOR_ORDER.length : i
}
