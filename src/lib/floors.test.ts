import { describe, expect, it } from 'vitest'
import { FLOOR_ORDER, SIN_PISO, groupRoomsByFloor } from './floors'
import type { Room } from './types'

/*
 * `groupRoomsByFloor` es lo que decide la forma del edificio en el mapa 3D. Lo que se
 * fija aquí son las dos maneras en que eso se rompe en silencio: que una planta sin
 * salas desaparezca (el edificio se encoge y el Piso 4 queda pegado al PH), y que una
 * sala con un piso que nadie registró se caiga del mapa sin avisar.
 */

function room(name: string, floor?: string): Room {
  return {
    resourceEmail: `${name}@resource.calendar.google.com`,
    name,
    floor,
  }
}

describe('groupRoomsByFloor', () => {
  it('devuelve las cinco plantas aunque casi todas estén vacías', () => {
    const groups = groupRoomsByFloor([room('La pecera', 'Piso 4')])

    expect(groups.map((g) => g.name)).toEqual([...FLOOR_ORDER])
    expect(groups.map((g) => g.level)).toEqual([0, 1, 2, 3, 4])
    expect(groups.filter((g) => g.rooms.length > 0)).toHaveLength(1)
  })

  it('apila de abajo hacia arriba: el PH es el nivel más alto', () => {
    const groups = groupRoomsByFloor([
      room('El Taller', 'PH'),
      room('La pecera', 'Piso 4'),
    ])

    const ph = groups.find((g) => g.name === 'PH')
    const piso4 = groups.find((g) => g.name === 'Piso 4')
    expect(ph!.level).toBeGreaterThan(piso4!.level)
  })

  it('agrupa varias salas de la misma planta en una sola losa', () => {
    const groups = groupRoomsByFloor([
      room('La pecera', 'Piso 4'),
      room('Salita Azul', 'Piso 4'),
    ])

    const piso4 = groups.find((g) => g.name === 'Piso 4')
    expect(piso4!.rooms.map((r) => r.name)).toEqual(['La pecera', 'Salita Azul'])
  })

  it('no pierde una sala cuyo piso no está registrado: la apila encima', () => {
    const groups = groupRoomsByFloor([room('Sótano raro', 'Piso 9')])

    expect(groups.at(-1)!.name).toBe('Piso 9')
    expect(groups.at(-1)!.rooms).toHaveLength(1)
  })

  it('junta las salas sin piso en su propio grupo en vez de descartarlas', () => {
    const groups = groupRoomsByFloor([room('Sala nueva'), room('Otra', '  ')])

    const sinPiso = groups.find((g) => g.name === SIN_PISO)
    expect(sinPiso!.rooms).toHaveLength(2)
  })
})
