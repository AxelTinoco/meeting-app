import { describe, expect, it } from 'vitest'
import { buildUpcoming, deriveRoomView } from './dashboard'
import type { Booking, Room } from './types'

/*
 * Los offsets de estas reservas NO son decorativos: son los que devuelve Google de
 * verdad. La misma junta se lee con el huso del calendario del que se saca, así que la
 * copia que guarda la sala puede volver en -07:00 y la del organizador en -06:00
 * aunque sean el mismo instante. Toda la derivación de estados tiene que aguantar esa
 * mezcla; si alguien vuelve a comparar los ISO como texto, estos tests se caen.
 */

const PECERA = 'c_pecera@resource.calendar.google.com'
const TALLER = 'c_taller@resource.calendar.google.com'

const ROOMS: Room[] = [
  { resourceEmail: PECERA, name: 'La pecera' },
  { resourceEmail: TALLER, name: 'El Taller' },
]

function booking(over: Partial<Booking> & Pick<Booking, 'startTime' | 'endTime'>): Booking {
  return {
    eventId: `ev-${over.startTime}`,
    roomEmail: PECERA,
    title: 'Prueba reunion',
    organizerEmail: 'axel@gerundio.com.mx',
    ...over,
  }
}

/** 11:00–12:00 hora de CDMX, tal como la devuelve el calendario de la sala. */
const PECERA_11 = booking({
  eventId: 'pecera-11',
  roomEmail: PECERA,
  startTime: '2026-08-13T10:00:00-07:00',
  endTime: '2026-08-13T11:00:00-07:00',
})

/** 10:30–11:30 CDMX, leída del calendario del organizador. */
const TALLER_1030 = booking({
  eventId: 'taller-1030',
  roomEmail: TALLER,
  title: 'Junta de equipo',
  startTime: '2026-08-13T10:30:00-06:00',
  endTime: '2026-08-13T11:30:00-06:00',
})

const at = (mxTime: string) => new Date(`2026-08-13T${mxTime}:00-06:00`)

describe('deriveRoomView', () => {
  it('marca la sala como activa mientras la reunión está en curso', () => {
    const view = deriveRoomView(ROOMS[0], [PECERA_11], at('11:30'))
    expect(view.status).toBe('active')
    expect(view.current?.eventId).toBe('pecera-11')
  })

  it('marca reservada antes de empezar y libre cuando ya terminó', () => {
    expect(deriveRoomView(ROOMS[0], [PECERA_11], at('09:00')).status).toBe('reserved')
    expect(deriveRoomView(ROOMS[0], [PECERA_11], at('13:08')).status).toBe('free')
  })

  it('anuncia como próxima la que empieza antes, no la que ordena antes por texto', () => {
    const otraEnPecera = booking({
      eventId: 'pecera-1030',
      roomEmail: PECERA,
      title: 'Junta de equipo',
      startTime: '2026-08-13T10:30:00-06:00',
      endTime: '2026-08-13T11:30:00-06:00',
    })
    // Como texto "T10:00:00-07:00" va antes que "T10:30:00-06:00", pero es media hora
    // MÁS TARDE. La sala debe anunciar la de las 10:30.
    const view = deriveRoomView(ROOMS[0], [PECERA_11, otraEnPecera], at('09:00'))
    expect(view.next?.eventId).toBe('pecera-1030')
    expect(view.todayCount).toBe(2)
  })
})

describe('buildUpcoming', () => {
  it('ordena la agenda por instante real, no por la cadena ISO', () => {
    const items = buildUpcoming([PECERA_11, TALLER_1030], ROOMS, at('09:00'))
    expect(items.map((i) => i.id).slice(0, 2)).toEqual(['taller-1030', 'pecera-11'])
  })

  it('reparte los estados en curso / próxima / finalizada', () => {
    const items = buildUpcoming([PECERA_11, TALLER_1030], ROOMS, at('11:45'))
    const byId = Object.fromEntries(items.map((i) => [i.id, i.status]))
    expect(byId['taller-1030']).toBe('ended') // terminó 11:30
    expect(byId['pecera-11']).toBe('active') // 11:00–12:00
  })

  it('añade un hueco "Libre" cuando ya no queda nada por delante', () => {
    const items = buildUpcoming([PECERA_11], ROOMS, at('13:08'))
    expect(items.map((i) => i.status)).toEqual(['ended', 'free'])
  })

  it('no inventa hueco después de que cierra el día', () => {
    const items = buildUpcoming([PECERA_11], ROOMS, at('20:30'))
    expect(items.every((i) => i.status !== 'free')).toBe(true)
  })
})
