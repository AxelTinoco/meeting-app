// Lo que hay en una planta además de las salas: el núcleo, los muebles y las áreas
// de trabajo. Nada de esto es un recurso de Calendar ni se puede reservar — existe
// solo para que el mapa se parezca al edificio y uno se ubique.

import type { RoomMapPosition } from './types'

/**
 * Cómo se dibuja un elemento. No es decoración: es la jerarquía que hace que las
 * salas —lo único accionable del mapa— sigan siendo lo primero que se ve.
 *
 *   nucleo — volumen de suelo a techo (escaleras, baños). Es la espina del edificio.
 *   mueble — volumen bajo (cafetería, librero). Sirve de referencia visual.
 *   area   — mancha a ras de losa (escritorios, operación). Ocupa sin estorbar.
 */
export type FixtureKind = 'nucleo' | 'mueble' | 'area'

export interface Fixture {
  name: string
  kind: FixtureKind
  /**
   * Plantas donde aparece, o `'todas'`.
   *
   * Las escaleras son `'todas'`: al repetirse en la misma posición en cada planta
   * se apilan solas y el hueco de escaleras aparece sin tener que modelarlo aparte.
   */
  floors: 'todas' | readonly string[]
  /** Mismo sistema que `room.map`: % del rectángulo de la planta. */
  map: RoomMapPosition
}

/**
 * Planta de Gerundio-HQ, tomada del plano a mano del Piso 4.
 *
 * Las coordenadas son % del rectángulo de la planta, igual que `room.map`, para que
 * salas y elementos fijos se posicionen con la misma regla y no haya que convertir
 * entre dos sistemas.
 */
export const FIXTURES: readonly Fixture[] = [
  {
    name: 'Escaleras',
    kind: 'nucleo',
    floors: 'todas',
    map: { x: 24.7, y: 0.8, w: 11.9, h: 46 },
  },
  {
    name: 'Baños',
    kind: 'nucleo',
    floors: 'todas',
    map: { x: 37.5, y: 0.5, w: 23.3, h: 46.7 },
  },
  /*
   * Banda intermedia del bloque derecho: cafetería y librero quedan justo debajo de
   * la pecera y encima de operación. En ese orden de izquierda a derecha, que es el
   * recorrido que ya describen las indicaciones de la sala ("pasando el área de café
   * y el librero, es la sala de vidrio").
   */
  {
    name: 'Cafetería',
    kind: 'mueble',
    floors: ['Piso 4'],
    map: { x: 69.9, y: 35.3, w: 7.7, h: 24.2 },
  },
  {
    name: 'Librero',
    kind: 'mueble',
    floors: ['Piso 4'],
    map: { x: 77.8, y: 35.3, w: 21.9, h: 24.2 },
  },
  {
    name: 'Escritorios',
    kind: 'area',
    floors: ['Piso 4'],
    map: { x: 21, y: 60.1, w: 49.2, h: 39.7 },
  },
  {
    name: 'Operación',
    kind: 'area',
    floors: ['Piso 4'],
    map: { x: 70.4, y: 60.5, w: 29.3, h: 38.9 },
  },
] as const

/** Los elementos fijos que le tocan a una planta. */
export function fixturesForFloor(floorName: string): Fixture[] {
  return FIXTURES.filter(
    (f) => f.floors === 'todas' || f.floors.includes(floorName),
  )
}
