import { describe, expect, it } from 'vitest'
import { FIXTURES, fixturesForFloor } from './floorplan'
import { ROOMS } from './rooms.config'
import { FLOOR_ORDER } from './floors'
import type { RoomMapPosition } from './types'

/*
 * Las coordenadas de la planta salieron de medir a ojo un plano dibujado a mano, así
 * que el error más probable no es de código: es que dos cosas queden encimadas o que
 * algo se salga de la losa. En pantalla eso se ve como muebles atravesando salas, y
 * cuesta notarlo girando el mapa. Aquí se ve solo.
 */

interface Named {
  name: string
  map: RoomMapPosition
}

function overlaps(a: RoomMapPosition, b: RoomMapPosition): boolean {
  return (
    a.x < b.x + b.w &&
    b.x < a.x + a.w &&
    a.y < b.y + b.h &&
    b.y < a.y + a.h
  )
}

/** Todo lo que se dibuja sobre una planta: sus elementos fijos y sus salas. */
function itemsOn(floor: string): Named[] {
  return [
    ...fixturesForFloor(floor),
    ...ROOMS.filter((r) => r.floor === floor && r.map).map((r) => ({
      name: r.name,
      map: r.map!,
    })),
  ]
}

describe('planta de Gerundio-HQ', () => {
  it('no encima dos elementos en ninguna planta', () => {
    const choques: string[] = []

    for (const floor of FLOOR_ORDER) {
      const items = itemsOn(floor)
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          if (overlaps(items[i].map, items[j].map)) {
            choques.push(`${floor}: ${items[i].name} × ${items[j].name}`)
          }
        }
      }
    }

    expect(choques).toEqual([])
  })

  it('mantiene todo dentro del rectángulo de la planta', () => {
    const fuera = [...FIXTURES, ...ROOMS.filter((r) => r.map)]
      .map((item) => ({ name: item.name, map: item.map! }))
      .filter(
        ({ map }) =>
          map.x < 0 || map.y < 0 || map.x + map.w > 100 || map.y + map.h > 100,
      )
      .map(({ name }) => name)

    expect(fuera).toEqual([])
  })

  it.each(['Escaleras', 'Baños'])(
    'repite %s en las cinco plantas y en la misma posición',
    (nombre) => {
      const tramos = FLOOR_ORDER.map(
        (floor) => fixturesForFloor(floor).find((f) => f.name === nombre)!,
      )

      expect(tramos.every(Boolean)).toBe(true)
      // Solo si comparten posición se apilan en un núcleo vertical continuo.
      expect(new Set(tramos.map((t) => JSON.stringify(t.map))).size).toBe(1)
    },
  )

  it('deja las plantas sin usar con el núcleo y nada más', () => {
    expect(fixturesForFloor('Piso 2').map((f) => f.name)).toEqual([
      'Escaleras',
      'Baños',
    ])
  })
})
