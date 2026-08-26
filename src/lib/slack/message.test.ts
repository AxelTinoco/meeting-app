import { describe, expect, it } from 'vitest'
import { ROOMS } from '../rooms.config'
import { bookingMessage, escapeText } from './message'
import { resolveNames } from './names'
import type { Booking } from '../types'

const PECERA = ROOMS[1]

/** 22 de agosto de 2026, 13:00 CDMX. Fijo para que los tests no dependan del día. */
const NOW = new Date('2026-08-22T13:00:00-06:00')

const BOOKING: Booking = {
  eventId: 'evt_1',
  roomEmail: PECERA.resourceEmail,
  title: 'Kickoff con cliente',
  startTime: '2026-08-22T13:00:00-06:00',
  endTime: '2026-08-22T14:00:00-06:00',
  organizerEmail: 'axel@gerundio.com.mx',
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

const NAMES = resolveNames(BOOKING, 'axel@gerundio.com.mx')

/** El mensaje ya es un solo string de mrkdwn; este alias solo mejora la lectura. */
function render(message: ReturnType<typeof bookingMessage>): string {
  return message.text
}

describe('escapeText', () => {
  it('neutraliza el marcado de Slack', () => {
    expect(escapeText('<!channel>')).toBe('&lt;!channel&gt;')
    expect(escapeText('Ventas & Marketing')).toBe('Ventas &amp; Marketing')
  })

  it('no re-escapa los ampersands que acaba de introducir', () => {
    // Si `<` se escapara antes que `&`, saldría `&amp;lt;`.
    expect(escapeText('<a & b>')).toBe('&lt;a &amp; b&gt;')
  })
})

describe('bookingMessage', () => {
  const base = {
    booking: BOOKING,
    room: PECERA,
    names: NAMES,
    actorEmail: 'axel@gerundio.com.mx',
    now: NOW,
  } as const

  it('nombra a los del equipo y deja a los externos con su correo', () => {
    const text = render(bookingMessage({ ...base, kind: 'created' }))
    expect(text).toContain('Organiza Axel')
    expect(text).toContain('María Ruiz')
    expect(text).toContain('ana@cliente.com (externa)')
  })

  it('dice edificio, piso y sala', () => {
    const text = render(bookingMessage({ ...base, kind: 'created' }))
    expect(text).toContain('La pecera')
    expect(text).toContain('Gerundio-HQ · Piso 4')
  })

  it('escapa el título: una junta no puede mencionar al canal entero', () => {
    const message = bookingMessage({
      ...base,
      kind: 'created',
      booking: { ...BOOKING, title: '<!channel> junta urgente' },
    })
    expect(message.text).not.toContain('<!channel>')
    expect(message.text).toContain('&lt;!channel&gt;')
  })

  it('usa "hoy" y el horario de CDMX', () => {
    const message = bookingMessage({ ...base, kind: 'created' })
    expect(message.text).toContain('hoy · 13:00–14:00')
  })

  it('nombra a quien opera cuando no es el organizador', () => {
    const actorEmail = 'otra.persona@gerundio.com.mx'
    const text = render(
      bookingMessage({
        ...base,
        kind: 'cancelled',
        names: resolveNames(BOOKING, actorEmail),
        actorEmail,
      }),
    )
    expect(text).toContain('Canceló Otra Persona')
  })

  it('no repite a quien opera si es el propio organizador', () => {
    const text = render(bookingMessage({ ...base, kind: 'updated' }))
    expect(text).not.toContain('Editó')
  })

  it('omite las ligas en una cancelación', () => {
    const message = bookingMessage({
      ...base,
      kind: 'cancelled',
      booking: { ...BOOKING, meetLink: 'https://meet.google.com/abc-defg-hij' },
    })
    expect(message.text).not.toContain('meet.google.com')
    expect(message.text).not.toContain('📍')
  })

  it('sobrevive a una sala que no está en la config', () => {
    const message = bookingMessage({
      ...base,
      kind: 'created',
      room: undefined,
    })
    expect(message.text).toContain('Sala sin registrar')
  })

  it('cae al headcount cuando no se invitó a nadie por correo', () => {
    const text = render(
      bookingMessage({
        ...base,
        kind: 'created',
        booking: { ...BOOKING, attendees: undefined, attendeeCount: 6 },
      }),
    )
    expect(text).toContain('6 personas')
  })
})
