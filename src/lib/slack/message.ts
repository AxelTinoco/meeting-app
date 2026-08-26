// Arma el mensaje que sale al canal. Función pura: sin fetch, sin credenciales.
//
// Está separada de `notify.ts` justamente para poder probarla — el escapado y el reparto
// interno/externo son lo único aquí que, si se rompe, se rompe de forma silenciosa.
//
// Sale UN SOLO string de mrkdwn, no Block Kit: el webhook de Workflow Builder solo acepta
// variables planas (ver `webhook.ts`), así que los bloques no tienen por dónde viajar.

import { MX_TZ, mxISODate, mxTimeLabel } from '../mexico-time'
import { roomLocationLabel, roomMapsUrl } from '../rooms.config'
import type { Booking, Room } from '../types'

export type BookingEventKind = 'created' | 'updated' | 'cancelled'

const HEADLINE: Record<BookingEventKind, string> = {
  created: '🗓️ Nueva junta',
  updated: '✏️ Junta actualizada',
  cancelled: '❌ Junta cancelada',
}

/**
 * Escapa el texto que escribió una persona antes de meterlo en un mensaje.
 *
 * No es cosmético: Slack interpreta `<…>` como marcado, así que una junta titulada
 * `<!channel>` le sonaría el teléfono a todo el workspace desde nuestro bot. Son los tres
 * caracteres que pide escapar la documentación de Slack, y en este orden — si `&` no va
 * primero, se re-escaparían los `&amp;` que acaban de salir de los otros dos.
 */
export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Liga en formato Slack. La URL no se escapa: la generamos nosotros, no el usuario. */
function link(url: string, label: string): string {
  return `<${url}|${escapeText(label)}>`
}

const DATE_FMT = new Intl.DateTimeFormat('es-MX', {
  timeZone: MX_TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

/** "hoy" o "vie, 22 ago". Casi todas las reservas son del día, y "hoy" se lee más rápido. */
function dateLabel(iso: string, now: Date): string {
  const día = mxISODate(new Date(iso))
  if (día === mxISODate(now)) return 'hoy'

  const mañana = mxISODate(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  if (día === mañana) return 'mañana'

  return DATE_FMT.format(new Date(iso))
}

/** Cómo se nombra a alguien en el mensaje. El correo es el último recurso. */
function nameOf(email: string, names: Map<string, string>): string {
  return escapeText(names.get(email.toLowerCase()) ?? email)
}

export interface BookingMessageInput {
  kind: BookingEventKind
  booking: Booking
  /** La sala de `rooms.config`. Puede faltar si la reserva apunta a una sala no registrada. */
  room?: Room
  /** Nombres ya resueltos, indexados por correo en minúsculas (ver `names.ts`). */
  names: Map<string, string>
  /** Quien ejecutó la acción. No siempre es el organizador: un admin toca juntas ajenas. */
  actorEmail: string
  /** Inyectable para que los tests no dependan del día en que se corren. */
  now?: Date
}

export interface SlackMessage {
  /** El mensaje completo en mrkdwn, listo para publicarse tal cual. */
  text: string
}

export function bookingMessage(input: BookingMessageInput): SlackMessage {
  const { kind, booking, room, names, actorEmail, now = new Date() } = input

  const roomName = escapeText(room?.name ?? 'Sala sin registrar')
  const title = escapeText(booking.title)
  // Tachado en las canceladas: quien pasa rápido por el canal ve que esa junta ya no va
  // sin tener que leer el encabezado.
  const titleLine = kind === 'cancelled' ? `*~${title}~*` : `*${title}*`

  const when = `${dateLabel(booking.startTime, now)} · ${mxTimeLabel(booking.startTime)}–${mxTimeLabel(booking.endTime)}`

  const lines = [`*${HEADLINE[kind]}*`, titleLine, `🕐  ${when}`]

  // El edificio y el piso son la mitad del encargo: sin ellos el aviso no dice a dónde ir.
  const place = [room?.building, room?.floor].filter(Boolean).join(' · ')
  lines.push(`🏢  ${roomName}${place ? ` — ${escapeText(place)}` : ''}`)

  if (booking.meetingType === 'cliente' && booking.clientName) {
    lines.push(`🤝  Cliente: ${escapeText(booking.clientName)}`)
  }

  const organizer = nameOf(booking.organizerEmail, names)
  const actorIsOrganizer =
    actorEmail.toLowerCase() === booking.organizerEmail.toLowerCase()
  const acción =
    kind === 'cancelled' ? 'Canceló' : kind === 'updated' ? 'Editó' : 'Reservó'
  lines.push(
    actorIsOrganizer
      ? `👤  Organiza ${organizer}`
      : `👤  Organiza ${organizer} · ${acción} ${nameOf(actorEmail, names)}`,
  )

  const guests = booking.attendees ?? []
  if (guests.length) {
    lines.push(
      `👥  ${guests
        .map((g) =>
          g.external
            ? `${nameOf(g.email, names)} (externa)`
            : nameOf(g.email, names),
        )
        .join(' · ')}`,
    )
  } else if (booking.attendeeCount) {
    // Juntas donde no se invitó a nadie por correo pero sí se declaró cuánta gente va:
    // el dato importa para saber si la sala se queda chica.
    lines.push(`👥  ${booking.attendeeCount} personas`)
  }

  // Las ligas son para quien va a la junta. En una cancelada no pintan nada.
  if (kind !== 'cancelled') {
    const maps = room ? roomMapsUrl(room) : undefined
    const refs = [
      room ? escapeText(roomLocationLabel(room) ?? '') : '',
      maps ? link(maps, 'Cómo llegar') : '',
      booking.meetLink ? link(booking.meetLink, 'Entrar a Meet') : '',
      booking.htmlLink ? link(booking.htmlLink, 'Ver en Calendar') : '',
    ].filter(Boolean)

    if (refs.length) lines.push(`📍  ${refs.join('  ·  ')}`)
  }

  return { text: lines.join('\n') }
}
