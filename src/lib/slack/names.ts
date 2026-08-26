// Cómo se nombra a cada persona dentro del aviso.
//
// Aquí vivía la traducción correo → mención de Slack (`<@U06MTD7DQ2F>`). No funcionó, y no
// por un error nuestro: Workflow Builder escapa las menciones que llegan dentro de una
// variable de texto —es su defensa para que un webhook, que cualquiera con la URL puede
// disparar, no pueda pinguear al workspace entero— así que el ID salía literal en el canal
// y a nadie le sonaba la notificación. Probado en vivo el 2026-08-26.
//
// Perdido el ping, lo único que queda por cuidar es que se lea bien. Los nombres salen del
// directorio de Google (`displayName`, que Calendar ya trae pegado a cada invitado) y,
// cuando falta, del propio correo. Tiene una ventaja que el mapa a mano que reemplaza no
// tenía: nadie necesita hacer un commit el día que entra alguien nuevo.

import { isDomainUser } from '../permissions'
import type { Booking } from '../types'

/** Los separadores que la gente usa en la parte local del correo. */
const SEPARATORS = /[._-]+/g

/** `ivonne.lopez@gerundio.com.mx` → `Ivonne Lopez`. */
function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .replace(SEPARATORS, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Nombre legible de una persona.
 *
 * A los externos no se les inventa nombre a partir del correo: su convención de direcciones
 * no es la nuestra (`ventas@`, `a.perez@`, `info@`) y la dirección completa es lo único que
 * de verdad los identifica ante quien lee el canal.
 */
export function personName(email: string, displayName?: string): string {
  const fromDirectory = displayName?.trim()
  if (fromDirectory) return fromDirectory

  if (!isDomainUser(email)) return email
  return nameFromEmail(email) || email
}

/**
 * Nombre de cada involucrado en la junta, indexado por correo en minúsculas.
 *
 * Involucrados = organizador + quien ejecuta la acción + invitados. Los tres pueden ser la
 * misma persona; el mapa deduplica solo.
 */
export function resolveNames(
  booking: Booking,
  actorEmail: string,
): Map<string, string> {
  const names = new Map<string, string>()

  const add = (email: string, displayName?: string): void => {
    const key = email.trim().toLowerCase()
    if (!key) return
    // Lo que trae nombre del directorio gana: el organizador entra sin `displayName` y no
    // debe pisar al mismo correo que ya entró como invitado con su nombre real.
    if (names.has(key) && !displayName) return
    names.set(key, personName(key, displayName))
  }

  add(booking.organizerEmail)
  add(actorEmail)
  for (const guest of booking.attendees ?? []) {
    add(guest.email, guest.displayName)
  }

  return names
}
