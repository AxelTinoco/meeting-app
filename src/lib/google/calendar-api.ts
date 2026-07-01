// Cliente REST de Google Calendar (compatible con Workers, sin `googleapis`).
// Todas las llamadas impersonan al usuario logueado vía `subject`.

import { CALENDAR_SCOPES } from '../constants'
import { MX_TZ } from '../mexico-time'
import type {
  Booking,
  BookingInput,
  BusyInterval,
  DateRange,
  MeetingType,
  RoomAvailability,
} from '../types'
import { getAccessToken } from './service-account'

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

async function authedFetch(
  subject: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken(subject, CALENDAR_SCOPES)
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) {
    throw new Error(
      `Calendar API ${init.method ?? 'GET'} ${path} falló (${res.status}): ${await res.text()}`,
    )
  }
  return res
}

// --- Tipos parciales de la respuesta de Calendar que nos interesan ---

interface GCalEventDateTime {
  dateTime?: string
  date?: string
  timeZone?: string
}

interface GCalEvent {
  id: string
  summary?: string
  htmlLink?: string
  start?: GCalEventDateTime
  end?: GCalEventDateTime
  organizer?: { email?: string }
  creator?: { email?: string }
  extendedProperties?: { private?: Record<string, string> }
}

function eventToBooking(roomEmail: string, ev: GCalEvent): Booking {
  const priv = ev.extendedProperties?.private ?? {}
  return {
    eventId: ev.id,
    roomEmail,
    title: ev.summary ?? '(sin título)',
    clientName: priv.clientName || undefined,
    meetingType: (priv.meetingType as MeetingType) || undefined,
    attendeeCount: priv.attendeeCount ? Number(priv.attendeeCount) : undefined,
    startTime: ev.start?.dateTime ?? ev.start?.date ?? '',
    endTime: ev.end?.dateTime ?? ev.end?.date ?? '',
    organizerEmail: ev.organizer?.email ?? ev.creator?.email ?? '',
    htmlLink: ev.htmlLink,
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
  const data = (await res.json()) as {
    calendars: Record<string, { busy?: BusyInterval[] }>
  }
  return roomEmails.map((roomEmail) => ({
    roomEmail,
    busy: data.calendars[roomEmail]?.busy ?? [],
  }))
}

/** events.insert en el calendario de la sala. Lanza si Calendar detecta conflicto. */
export async function insertEvent(input: BookingInput): Promise<Booking> {
  const priv: Record<string, string> = { organizerEmail: input.organizerEmail }
  if (input.clientName) priv.clientName = input.clientName
  if (input.meetingType) priv.meetingType = input.meetingType
  if (input.attendeeCount != null) priv.attendeeCount = String(input.attendeeCount)

  const res = await authedFetch(
    input.organizerEmail,
    `/calendars/${encodeURIComponent(input.roomEmail)}/events?sendUpdates=none`,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: input.startTime, timeZone: MX_TZ },
        end: { dateTime: input.endTime, timeZone: MX_TZ },
        attendees: [
          { email: input.roomEmail, resource: true },
          { email: input.organizerEmail, organizer: true },
        ],
        extendedProperties: { private: priv },
      }),
    },
  )
  return eventToBooking(input.roomEmail, (await res.json()) as GCalEvent)
}

/** events.delete en el calendario de la sala. */
export async function deleteEvent(
  subject: string,
  roomEmail: string,
  eventId: string,
): Promise<void> {
  await authedFetch(
    subject,
    `/calendars/${encodeURIComponent(roomEmail)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    { method: 'DELETE' },
  )
}

/** events.list de una sala en un rango, ya mapeado a Booking. */
export async function listRoomEvents(
  subject: string,
  roomEmail: string,
  range: DateRange,
): Promise<Booking[]> {
  const params = new URLSearchParams({
    timeMin: range.timeMin,
    timeMax: range.timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await authedFetch(
    subject,
    `/calendars/${encodeURIComponent(roomEmail)}/events?${params}`,
  )
  const data = (await res.json()) as { items?: GCalEvent[] }
  return (data.items ?? []).map((ev) => eventToBooking(roomEmail, ev))
}
