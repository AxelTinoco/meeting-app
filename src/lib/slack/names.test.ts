import { describe, expect, it } from 'vitest'
import { personName, resolveNames } from './names'
import type { Booking } from '../types'

const BOOKING: Booking = {
  eventId: 'evt_1',
  roomEmail: 'sala@gerundio.com.mx',
  title: 'Junta',
  startTime: '2026-08-22T13:00:00-06:00',
  endTime: '2026-08-22T14:00:00-06:00',
  organizerEmail: 'Axel@Gerundio.com.mx',
  attendees: [
    {
      email: 'maria@gerundio.com.mx',
      displayName: 'María Ruiz',
      response: 'accepted',
      external: false,
    },
    { email: 'ana@cliente.com', response: 'needsAction', external: true },
  ],
}

describe('personName', () => {
  it('prefiere el nombre del directorio', () => {
    expect(personName('maria@gerundio.com.mx', 'María Ruiz')).toBe('María Ruiz')
  })

  it('arma el nombre desde el correo cuando el directorio no lo trae', () => {
    expect(personName('ivonne.lopez@gerundio.com.mx')).toBe('Ivonne Lopez')
    expect(personName('juan-carlos_perez@gerundio.com.mx')).toBe(
      'Juan Carlos Perez',
    )
  })

  it('deja el correo completo a los externos', () => {
    // Su convención de direcciones no es la nuestra: "ventas@acme.com" no es una persona
    // llamada Ventas, y el correo es lo único que de verdad lo identifica en el canal.
    expect(personName('ventas@acme.com')).toBe('ventas@acme.com')
  })
})

describe('resolveNames', () => {
  it('indexa en minúsculas a organizador, invitados y quien opera', () => {
    const names = resolveNames(BOOKING, 'admin@gerundio.com.mx')
    expect(names.get('axel@gerundio.com.mx')).toBe('Axel')
    expect(names.get('maria@gerundio.com.mx')).toBe('María Ruiz')
    expect(names.get('ana@cliente.com')).toBe('ana@cliente.com')
    expect(names.get('admin@gerundio.com.mx')).toBe('Admin')
  })

  it('no deja que el organizador pise el nombre real de un invitado', () => {
    // El mismo correo entra dos veces: primero sin `displayName` y luego con él.
    const names = resolveNames(
      { ...BOOKING, organizerEmail: 'maria@gerundio.com.mx' },
      'maria@gerundio.com.mx',
    )
    expect(names.get('maria@gerundio.com.mx')).toBe('María Ruiz')
  })
})
