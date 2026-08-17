// Cliente REST de Google Calendar (compatible con Workers, sin `googleapis`).
// Todas las llamadas impersonan al usuario logueado vía `subject`.
//
// Modelo de datos: la junta se crea en el calendario del ORGANIZADOR y la sala entra como
// asistente de tipo recurso (`resource: true`). Es el patrón estándar de Google para reserva
// de salas y es lo que permite invitar gente: el organizador es la persona, no la sala, así
// que las invitaciones y las respuestas (RSVP) fluyen hacia quien reservó.
//
// La copia del evento que ve el calendario de la sala comparte el mismo `id`, por eso el
// dashboard puede seguir leyendo la ocupación sala por sala.

import { CALENDAR_SCOPES, GOOGLE_WORKSPACE_DOMAIN } from '../constants'
import { MX_TZ } from '../mexico-time'
import {
  findRoom,
  roomEventDescription,
  roomEventLocation,
} from '../rooms.config'
import type {
  AttendeeResponse,
  Booking,
  BookingAttendee,
  BookingInput,
  BusyInterval,
  DateRange,
  MeetingType,
  RoomAvailability,
} from '../types'
import { getAccessToken } from './service-account'

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

/** Calendario propio del usuario impersonado. Ahí viven las juntas que él organiza. */
const PRIMARY = 'primary'

async function rawFetch(
  subject: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken(subject, CALENDAR_SCOPES)
  return fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

async function authedFetch(
  subject: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await rawFetch(subject, path, init)
  if (!res.ok) {
    throw new Error(
      `Calendar API ${init.method ?? 'GET'} ${path} falló (${res.status}): ${await res.text()}`,
    )
  }
  return res
}

// --- Tipos parciales de la respuesta de Calendar que nos interesan ---

interface GCalDateTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

interface GCalAttendee {
  email?: string
  displayName?: string
  resource?: boolean
  organizer?: boolean
  responseStatus?: string
}

interface GCalEntryPoint {
  entryPointType?: string
  uri?: string
}

interface GCalConferenceData {
  conferenceId?: string
  entryPoints?: GCalEntryPoint[]
  createRequest?: { requestId?: string; status?: { statusCode?: string } }
}

interface GCalEvent {
  id: string
  summary?: string
  htmlLink?: string
  status?: string
  start?: GCalDateTime
  end?: GCalDateTime
  organizer?: { email?: string }
  creator?: { email?: string }
  attendees?: GCalAttendee[]
  /** Atajo de Google a la liga de Meet. Es lo mismo que el entryPoint de video. */
  hangoutLink?: string
  conferenceData?: GCalConferenceData
  extendedProperties?: {
    private?: Record<string, string>
    shared?: Record<string, string>
  }
}

/**
 * Liga de la videollamada, si la junta tiene sala virtual.
 *
 * `hangoutLink` es el camino corto, pero solo aparece en conferencias de Meet ya
 * creadas: una recién pedida puede volver con `conferenceData.createRequest` en curso
 * y el entryPoint listo antes que el atajo, de ahí el segundo intento.
 */
function meetLinkOf(ev: GCalEvent): string | undefined {
  if (ev.hangoutLink) return ev.hangoutLink
  return ev.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video' && e.uri,
  )?.uri
}

const RESPONSES: AttendeeResponse[] = [
  'accepted',
  'declined',
  'tentative',
  'needsAction',
]

const MEETING_TYPES: MeetingType[] = [
  'interno',
  'cliente',
  'entrevista',
  'otro',
]

/** `extendedProperties` es texto libre: cualquiera con acceso al evento pudo escribir ahí. */
function toMeetingType(value: string | undefined): MeetingType | undefined {
  return MEETING_TYPES.includes(value as MeetingType)
    ? (value as MeetingType)
    : undefined
}

function isExternal(email: string): boolean {
  return !email
    .toLowerCase()
    .endsWith(`@${GOOGLE_WORKSPACE_DOMAIN.toLowerCase()}`)
}

function toBookingAttendee(a: GCalAttendee): BookingAttendee {
  const email = a.email ?? ''
  const response = RESPONSES.includes(a.responseStatus as AttendeeResponse)
    ? (a.responseStatus as AttendeeResponse)
    : 'needsAction'
  return {
    email,
    displayName: a.displayName || undefined,
    response,
    external: isExternal(email),
  }
}

function eventToBooking(ev: GCalEvent, fallbackRoomEmail?: string): Booking {
  // Los metadatos van en `shared` para que sobrevivan en la copia del evento que ve la sala
  // (`private` solo existe en la copia del creador). Leemos ambos porque los eventos creados
  // antes de este cambio usaban `private`.
  // El tipo explícito refleja que cualquier clave puede faltar: un índice de
  // `Record<string, string>` miente diciendo que siempre hay valor.
  const meta: Record<string, string | undefined> = {
    ...(ev.extendedProperties?.private ?? {}),
    ...(ev.extendedProperties?.shared ?? {}),
  }

  const all = ev.attendees ?? []
  const room = all.find((a) => a.resource)
  const roomEmail = room?.email ?? fallbackRoomEmail ?? ''
  const organizerEmail = ev.organizer?.email ?? ev.creator?.email ?? ''

  const attendees = all
    .filter(
      (a) =>
        !a.resource &&
        a.email &&
        a.email.toLowerCase() !== organizerEmail.toLowerCase(),
    )
    .map(toBookingAttendee)

  return {
    eventId: ev.id,
    roomEmail,
    title: ev.summary ?? '(sin título)',
    clientName: meta.clientName || undefined,
    meetingType: toMeetingType(meta.meetingType),
    attendeeCount: meta.attendeeCount ? Number(meta.attendeeCount) : undefined,
    attendees: attendees.length ? attendees : undefined,
    roomResponse: room ? toBookingAttendee(room).response : undefined,
    startTime: ev.start?.dateTime ?? ev.start?.date ?? '',
    endTime: ev.end?.dateTime ?? ev.end?.date ?? '',
    organizerEmail,
    htmlLink: ev.htmlLink,
    meetLink: meetLinkOf(ev),
  }
}

/** Normaliza la lista de invitados: minúsculas, sin duplicados, sin la sala ni el organizador. */
function normalizeGuests(
  attendees: string[] | undefined,
  organizerEmail: string,
  roomEmail: string,
): string[] {
  const excluded = new Set([
    organizerEmail.toLowerCase(),
    roomEmail.toLowerCase(),
  ])
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of attendees ?? []) {
    const email = raw.trim().toLowerCase()
    if (!email || excluded.has(email) || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

/**
 * ¿La junta ya tiene sala virtual?
 *
 * No basta con mirar la liga: una conferencia recién pedida existe (`conferenceId`)
 * aunque su entryPoint todavía no esté publicado, y tratarla como inexistente haría
 * que la siguiente edición pidiera una segunda sala.
 */
function hasMeet(ev: GCalEvent): boolean {
  return meetLinkOf(ev) != null || ev.conferenceData?.conferenceId != null
}

/**
 * Parte del body que gobierna la sala virtual de Meet.
 *
 * Google no expone un "activa/desactiva Meet": se pide una conferencia nueva con
 * `createRequest` o se borra mandando `null`. Por eso hay tres casos y no dos —
 * cuando la junta ya tiene Meet y sigue queriéndolo, lo correcto es NO mandar el
 * campo: un `createRequest` nuevo generaría otra liga y la que ya circula en los
 * correos de los invitados dejaría de ser la buena.
 *
 * Requiere `conferenceDataVersion=1` en la petición; sin ese parámetro Calendar
 * ignora este bloque en silencio.
 */
function conferencePatch(want: boolean, hasMeetNow: boolean) {
  if (want && !hasMeetNow) {
    return {
      conferenceData: {
        createRequest: {
          // Identifica el intento, no la conferencia: reintentar con el mismo id
          // devuelve la misma sala en vez de crear otra.
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }
  }
  if (!want && hasMeetNow) return { conferenceData: null }
  return {}
}

/**
 * Cuerpo del evento compartido por insert y patch.
 *
 * `current` es el evento tal como está hoy en Calendar (solo en edición): se usa para
 * saber si ya tiene Meet y decidir si hay que crearlo, quitarlo o dejarlo en paz.
 */
function eventBody(input: BookingInput, current?: GCalEvent) {
  const shared: Record<string, string> = {}
  if (input.clientName) shared.clientName = input.clientName
  if (input.meetingType) shared.meetingType = input.meetingType
  if (input.attendeeCount != null)
    shared.attendeeCount = String(input.attendeeCount)

  const guests = normalizeGuests(
    input.attendees,
    input.organizerEmail,
    input.roomEmail,
  )

  // Ubicación en lenguaje humano para el invitado externo: la app no la ve, pero el
  // correo de invitación sí. Si la sala no está en config (o no tiene textos), los campos
  // salen `undefined` y `JSON.stringify` los omite, así que el PATCH los deja intactos.
  const room = findRoom(input.roomEmail)

  return {
    summary: input.title,
    location: room ? roomEventLocation(room) : undefined,
    description: room ? roomEventDescription(room) : undefined,
    start: { dateTime: input.startTime, timeZone: MX_TZ },
    end: { dateTime: input.endTime, timeZone: MX_TZ },
    attendees: [
      { email: input.roomEmail, resource: true },
      ...guests.map((email) => ({ email })),
    ],
    // Los invitados se ven entre sí. Ojo si algún día se quiere ocultar la lista en juntas
    // con cliente: la sala es un invitado más, así que con `false` el dashboard tampoco
    // podría mostrar quién asiste (lee la copia del evento que ve la sala).
    guestsCanSeeOtherGuests: true,
    // Solo quien reserva controla la lista, para que la app sea la fuente de verdad.
    guestsCanInviteOthers: false,
    extendedProperties: { shared },
    ...conferencePatch(
      input.withMeet === true,
      current != null && hasMeet(current),
    ),
  }
}

/** freebusy.query para una o varias salas. */
export async function freebusyQuery(
  subject: string,
  roomEmails: string[],
  range: DateRange,
): Promise<RoomAvailability[]> {
  const res = await authedFetch(subject, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin: range.timeMin,
      timeMax: range.timeMax,
      timeZone: MX_TZ,
      items: roomEmails.map((id) => ({ id })),
    }),
  })
  // Google puede omitir un calendario de la respuesta (p. ej. si no existe), de ahí el
  // `| undefined` explícito en el índice.
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: BusyInterval[] } | undefined>
  }
  return roomEmails.map((roomEmail) => ({
    roomEmail,
    busy: data.calendars[roomEmail]?.busy ?? [],
  }))
}

const ROOM_BUSY_ERROR = 'La sala ya está reservada en ese horario.'

/**
 * Rechaza si la sala ya está ocupada.
 *
 * NO es autoritativo: freebusy tarda varios segundos en reflejar una reserva recién hecha,
 * así que dos personas reservando con segundos de diferencia pueden pasar ambas por aquí.
 * Quien decide de verdad es el recurso — ver `roomResponse` en el Booking.
 */
async function assertRoomFree(
  subject: string,
  roomEmail: string,
  startTime: string,
  endTime: string,
  /** Hueco que ocupa la propia reserva que se está moviendo, para no chocar consigo misma. */
  ignore?: { start: string; end: string },
): Promise<void> {
  const [availability] = await freebusyQuery(subject, [roomEmail], {
    timeMin: startTime,
    timeMax: endTime,
  })
  // Comparar por instante, no por texto: el calendario de la sala puede devolver los
  // horarios con un offset distinto al que usa freebusy (-08:00 vs -06:00) y entonces
  // dos marcas del mismo momento no coinciden como cadenas.
  const busy = ignore
    ? availability.busy.filter(
        (b) =>
          !(
            Date.parse(b.start) >= Date.parse(ignore.start) &&
            Date.parse(b.end) <= Date.parse(ignore.end)
          ),
      )
    : availability.busy
  if (busy.length > 0) throw new Error(ROOM_BUSY_ERROR)
}

/**
 * Crea la junta en el calendario del organizador con la sala como recurso.
 * `sendUpdates=all` es lo que hace que a los invitados les llegue el correo.
 *
 * No esperamos a que la sala acepte: medido, tarda 13-15s, y bloquear ahí volvería
 * inusable el botón de reservar. El dashboard cubre ese hueco leyendo también el
 * calendario del usuario (ver `getDayBookings`), y una reserva rechazada por choque
 * desaparece sola porque filtramos las que la sala declinó.
 */
export async function insertEvent(input: BookingInput): Promise<Booking> {
  const subject = input.organizerEmail
  await assertRoomFree(subject, input.roomEmail, input.startTime, input.endTime)

  const res = await authedFetch(
    subject,
    `/calendars/${PRIMARY}/events?sendUpdates=all&conferenceDataVersion=1`,
    { method: 'POST', body: JSON.stringify(eventBody(input)) },
  )
  return eventToBooking((await res.json()) as GCalEvent, input.roomEmail)
}

/**
 * Localiza en qué calendario vive el evento y lo devuelve.
 *
 * Normalmente en el del organizador. Los eventos creados antes de este cambio tienen a la
 * sala como organizadora y solo existen en el calendario de la sala, así que caemos a ese.
 * Devuelve null si no aparece en ninguno.
 */
async function resolveEvent(
  subject: string,
  roomEmail: string,
  eventId: string,
): Promise<{ calendarId: string; event: GCalEvent } | null> {
  for (const calendarId of [PRIMARY, roomEmail]) {
    const res = await rawFetch(
      subject,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    )
    if (res.ok) {
      const event = (await res.json()) as GCalEvent
      if (event.status !== 'cancelled') return { calendarId, event }
    }
  }
  return null
}

/**
 * Devuelve una reserva concreta, o null si ya no existe.
 *
 * Se usa para saber de quién es antes de dejar editarla o cancelarla, así que la lectura
 * va con el `subject` de quien pregunta: si no puede ver el evento, tampoco puede tocarlo.
 */
export async function getEvent(
  subject: string,
  roomEmail: string,
  eventId: string,
): Promise<Booking | null> {
  const found = await resolveEvent(subject, roomEmail, eventId)
  return found ? eventToBooking(found.event, roomEmail) : null
}

/** Actualiza la junta conservando el evento (y por tanto las respuestas de los invitados). */
export async function patchEvent(
  eventId: string,
  input: BookingInput,
): Promise<Booking> {
  const subject = input.organizerEmail
  const found = await resolveEvent(subject, input.roomEmail, eventId)
  if (!found) throw new Error('La reserva ya no existe.')
  const { calendarId, event: original } = found

  // Si se mueve de horario hay que revalidar la sala; si solo cambia título o invitados,
  // el recurso ya está aceptado y no vuelve a evaluar.
  const originalStart = original.start?.dateTime
  const originalEnd = original.end?.dateTime
  const timeChanged =
    Date.parse(originalStart ?? '') !== Date.parse(input.startTime) ||
    Date.parse(originalEnd ?? '') !== Date.parse(input.endTime)
  if (timeChanged) {
    await assertRoomFree(
      subject,
      input.roomEmail,
      input.startTime,
      input.endTime,
      originalStart && originalEnd
        ? { start: originalStart, end: originalEnd }
        : undefined,
    )
  }

  const res = await authedFetch(
    subject,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all&conferenceDataVersion=1`,
    { method: 'PATCH', body: JSON.stringify(eventBody(input, original)) },
  )
  return eventToBooking((await res.json()) as GCalEvent, input.roomEmail)
}

/** Cancela la junta y notifica a los invitados. */
export async function deleteEvent(
  subject: string,
  roomEmail: string,
  eventId: string,
): Promise<void> {
  const found = await resolveEvent(subject, roomEmail, eventId)
  // Ya no existe (o alguien más la canceló): la cancelación es idempotente.
  if (!found) return
  const { calendarId } = found

  const res = await rawFetch(
    subject,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: 'DELETE' },
  )
  // 410 = ya estaba cancelado.
  if (!res.ok && res.status !== 410) {
    throw new Error(
      `No se pudo cancelar la reserva (${res.status}): ${await res.text()}`,
    )
  }
}

function listParams(range: DateRange): URLSearchParams {
  return new URLSearchParams({
    timeMin: range.timeMin,
    timeMax: range.timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
}

/** events.list de una sala en un rango, ya mapeado a Booking. */
export async function listRoomEvents(
  subject: string,
  roomEmail: string,
  range: DateRange,
): Promise<Booking[]> {
  const res = await authedFetch(
    subject,
    `/calendars/${encodeURIComponent(roomEmail)}/events?${listParams(range)}`,
  )
  const data = (await res.json()) as { items?: GCalEvent[] }
  return (data.items ?? []).map((ev) => eventToBooking(ev, roomEmail))
}

/**
 * Juntas del usuario en alguna de nuestras salas, leídas de su propio calendario.
 *
 * Sirve para dos cosas: la vista "mis reservas" y tapar el hueco de propagación del
 * dashboard — el calendario de la sala tarda ~15s en reflejar una reserva nueva, pero
 * el del organizador la tiene al instante.
 *
 * Descarta las que la sala rechazó: si dos personas ganaron la carrera por el mismo
 * horario, la perdedora se queda sin sala y no debe ocupar espacio en el mapa.
 */
export async function listMyEvents(
  subject: string,
  range: DateRange,
  roomEmails: string[],
  /** Si es false, incluye también juntas donde el usuario es invitado y no organizador. */
  onlyOrganized = true,
): Promise<Booking[]> {
  const known = new Set(roomEmails.map((e) => e.toLowerCase()))
  const res = await authedFetch(
    subject,
    `/calendars/${PRIMARY}/events?${listParams(range)}`,
  )
  const data = (await res.json()) as { items?: GCalEvent[] }

  return (data.items ?? [])
    .filter((ev) =>
      (ev.attendees ?? []).some(
        (a) => a.email && known.has(a.email.toLowerCase()),
      ),
    )
    .map((ev) => eventToBooking(ev))
    .filter((b) => b.roomResponse !== 'declined')
    .filter(
      (b) =>
        !onlyOrganized ||
        b.organizerEmail.toLowerCase() === subject.toLowerCase(),
    )
}
