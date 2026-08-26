// Avisos al canal de Slack cuando alguien reserva, mueve o cancela una junta.
//
// REGLA DE ORO: nada de aquí puede tumbar una reserva. Google es obligatorio —sin
// credenciales la app no arranca— pero Slack es un extra: si el workflow se desactivó, la
// URL cambió o Slack está caído, la junta ya se creó y lo único que se pierde es el aviso.
// Por eso todas las funciones de este módulo atrapan sus propios errores y no devuelven
// nada que el llamador tenga que revisar.

import { hasSlackWebhook } from '../env'
import { findRoom } from '../rooms.config'
import type { Booking } from '../types'
import { postToWebhook } from './webhook'
import { resolveNames } from './names'
import { bookingMessage } from './message'
import type { BookingEventKind } from './message'

async function notify(
  kind: BookingEventKind,
  booking: Booking,
  actorEmail: string,
): Promise<void> {
  // Sin configurar no es un error: es un entorno (dev, o el día en que aún no existía el
  // workflow) donde simplemente no se avisa.
  if (!hasSlackWebhook()) return

  try {
    const { text } = bookingMessage({
      kind,
      booking,
      room: findRoom(booking.roomEmail),
      names: resolveNames(booking, actorEmail),
      actorEmail,
    })
    // El organizador primero: es su reserva la que quedó, se movió o se canceló. Quien
    // ejecutó la acción es el respaldo — siempre es un humano con sesión en la app, así que
    // rescata el aviso cuando el organizador es una sala (ver `webhook.ts`).
    await postToWebhook({
      text,
      mentionCandidates: [booking.organizerEmail, actorEmail],
    })
  } catch (error) {
    // A propósito solo al log: quien reservó no puede hacer nada con este fallo, y ver un
    // error después de que su junta quedó bien creada solo le haría dudar de si quedó.
    console.error(`Slack: no se pudo avisar de la junta (${kind})`, error)
  }
}

/**
 * Avisa de una junta nueva.
 *
 * Se espera (`await`) en vez de dispararlo y olvidarlo porque en Workers una promesa
 * suelta se cancela en cuanto se responde: el aviso se perdería a medias, unas veces sí y
 * otras no. Es una sola llamada HTTP: los nombres se resuelven en memoria.
 */
export function notifyBookingCreated(
  booking: Booking,
  actorEmail: string,
): Promise<void> {
  return notify('created', booking, actorEmail)
}

/** Avisa de una junta que cambió de horario, sala o invitados. */
export function notifyBookingUpdated(
  booking: Booking,
  actorEmail: string,
): Promise<void> {
  return notify('updated', booking, actorEmail)
}

/**
 * Avisa de una junta cancelada.
 *
 * Recibe la reserva tal como estaba ANTES de borrarla: una vez cancelada en Calendar ya no
 * hay de dónde sacar el título ni los invitados.
 */
export function notifyBookingCancelled(
  booking: Booking,
  actorEmail: string,
): Promise<void> {
  return notify('cancelled', booking, actorEmail)
}
