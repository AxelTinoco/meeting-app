import { describe, expect, it } from 'vitest'
import {
  ROOMS,
  roomEventDescription,
  roomEventLocation,
  roomLocationLabel,
} from './rooms.config'
import type { Room } from './types'

/*
 * Estos textos son la única pista que tiene un invitado externo para saber a dónde ir:
 * salen en el correo de invitación, no en la app, así que nadie de dentro se entera si
 * quedan mal. Lo que se fija aquí es que una sala a medio llenar (sin dirección, sin
 * descripción, recién creada desde el Admin Console) siga produciendo algo legible en
 * vez de comas sueltas o un bloque "Cómo llegar" vacío.
 */

function room(patch: Partial<Room> = {}): Room {
  return {
    resourceEmail: 'x@resource.calendar.google.com',
    name: 'El Taller',
    ...patch,
  }
}

describe('roomLocationLabel', () => {
  it('prefiere la descripción humana sobre el identificador interno', () => {
    const r = room({
      description: 'Terraza techada',
      building: 'Gerundio-HQ',
      floor: 'PH',
    })
    expect(roomLocationLabel(r)).toBe('Terraza techada')
  })

  it('cae a building · floor cuando la sala aún no tiene descripción', () => {
    expect(
      roomLocationLabel(room({ building: 'Gerundio-HQ', floor: 'PH' })),
    ).toBe('Gerundio-HQ · PH')
  })

  it('no inventa ubicación si no hay ningún dato', () => {
    expect(roomLocationLabel(room())).toBeUndefined()
  })
})

describe('roomEventLocation', () => {
  it('pone la dirección al final, que es la cola que Google geocodifica', () => {
    const r = room({
      description: 'Terraza techada',
      address: 'Av. Siempre Viva 123, CDMX',
    })
    expect(roomEventLocation(r)).toBe(
      'El Taller, Terraza techada, Av. Siempre Viva 123, CDMX',
    )
  })

  it('no deja comas colgando cuando faltan campos', () => {
    expect(roomEventLocation(room())).toBe('El Taller')
  })
})

describe('roomEventDescription', () => {
  it('arma el bloque con indicaciones, dirección y link a Maps', () => {
    const r = room({
      directions: 'Elevador al PH.',
      address: 'Av. Siempre Viva 123',
    })
    const out = roomEventDescription(r)
    expect(out).toContain('Cómo llegar')
    expect(out).toContain('Elevador al PH.')
    expect(out).toContain('https://www.google.com/maps/search/')
  })

  it('devuelve undefined sin datos, para que el PATCH no borre la descripción', () => {
    expect(
      roomEventDescription(room({ description: 'Terraza techada' })),
    ).toBeUndefined()
  })
})

describe('ROOMS', () => {
  it('todas las salas configuradas describen el lugar para gente externa', () => {
    for (const r of ROOMS) {
      expect(r.description, `${r.name} sin description`).toBeTruthy()
      expect(r.directions, `${r.name} sin directions`).toBeTruthy()
    }
  })
})
