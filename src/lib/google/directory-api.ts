// Directorio de Workspace vía People API (compatible con Workers, sin `googleapis`).
//
// Calendar no da fotos: de cada asistente solo devuelve `email` y `displayName`. La foto
// vive en el perfil del directorio, así que se trae por separado y se cruza por correo.
// Tampoco hay búsqueda por email en la API, así que se lista el directorio completo y se
// indexa en memoria — con el tamaño de Gerundio es una sola llamada.

import { DIRECTORY_SCOPES } from '../constants'
import type { Booking } from '../types'
import { getAccessToken } from './service-account'

const PEOPLE_URL = 'https://people.googleapis.com/v1/people:listDirectoryPeople'

/** Máximo que acepta la API (por defecto son 100, que se quedarían cortos). */
const PAGE_SIZE = 1000

/** Tope defensivo por si `nextPageToken` nunca se vacía: 5 páginas = 5000 personas. */
const MAX_PAGES = 5

/**
 * Tamaño en px que se le pide a Google. Se pinta a 16-36px, así que 96 cubre pantallas
 * retina sin traer la foto completa.
 */
const PHOTO_SIZE = 96

const CACHE_TTL_MS = 10 * 60 * 1000

/** Perfil del directorio, reducido a lo que pinta la UI. */
export interface DirectoryPerson {
  email: string
  name?: string
  /** Ausente si la persona no subió foto: ahí Google manda una silueta genérica. */
  picture?: string
}

// --- Tipos parciales de la respuesta de People que nos interesan ---

interface PeopleName {
  displayName?: string
}

interface PeopleEmail {
  value?: string
  metadata?: { primary?: boolean }
}

interface PeoplePhoto {
  url?: string
  /** true = silueta que pone Google, no una foto real del usuario. */
  default?: boolean
}

interface PeoplePerson {
  names?: PeopleName[]
  emailAddresses?: PeopleEmail[]
  photos?: PeoplePhoto[]
}

/**
 * Cache del directorio a nivel de módulo, sin distinguir por usuario: el directorio del
 * dominio es el mismo para todos, así que impersonar a uno u otro da la misma lista.
 * Best-effort igual que la cache de tokens — el worker puede reiniciarse entre peticiones.
 */
let cache: { people: Map<string, DirectoryPerson>; expiresAt: number } | null = null

/** Le pide a Google la foto ya escalada en vez de la original. */
function sizedPhoto(url: string): string {
  return url.includes('?') ? url : `${url}?sz=${PHOTO_SIZE}`
}

function toDirectoryPerson(person: PeoplePerson): DirectoryPerson | null {
  const emails = person.emailAddresses ?? []
  // `.at(0)` y no `[0]`: el índice se tiparía como si siempre hubiera elemento.
  const email = (emails.find((e) => e.metadata?.primary) ?? emails.at(0))?.value
  if (!email) return null

  // `default: true` es la silueta gris de Google. Tratarla como foto real llenaría la UI
  // de monigotes idénticos; sin ella, el componente cae a las iniciales.
  const photo = (person.photos ?? []).find((p) => p.url && !p.default)

  return {
    email: email.toLowerCase(),
    name: person.names?.[0]?.displayName || undefined,
    picture: photo?.url ? sizedPhoto(photo.url) : undefined,
  }
}

async function fetchDirectory(subject: string): Promise<Map<string, DirectoryPerson>> {
  const token = await getAccessToken(subject, DIRECTORY_SCOPES)
  const people = new Map<string, DirectoryPerson>()
  let pageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(PEOPLE_URL)
    // `readMask` y `sources` son obligatorios: sin ellos la API responde 400.
    url.searchParams.set('readMask', 'names,emailAddresses,photos')
    // Solo perfiles del dominio. La otra fuente (DOMAIN_CONTACT) son contactos externos
    // que un admin dio de alta a mano; aquí no hay.
    url.searchParams.set('sources', 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE')
    url.searchParams.set('pageSize', String(PAGE_SIZE))
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw new Error(
        `People API listDirectoryPeople falló (${res.status}): ${await res.text()}`,
      )
    }

    const data = (await res.json()) as {
      people?: PeoplePerson[]
      nextPageToken?: string
    }
    for (const raw of data.people ?? []) {
      const person = toDirectoryPerson(raw)
      if (person) people.set(person.email, person)
    }

    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return people
}

/** Directorio del dominio indexado por correo (minúsculas), cacheado 10 minutos. */
export async function getDirectory(
  subject: string,
): Promise<Map<string, DirectoryPerson>> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.people

  const people = await fetchDirectory(subject)
  cache = { people, expiresAt: now + CACHE_TTL_MS }
  return people
}

/**
 * Añade a cada asistente su foto (y su nombre, si Calendar no lo trajo).
 *
 * Degrada en silencio: si la People API no está habilitada en el proyecto o el scope no
 * está autorizado en la delegación de dominio, se devuelven las reservas tal cual. Las
 * fotos son un adorno y no deben poder tumbar el dashboard.
 */
export async function withAttendeePhotos(
  bookings: Booking[],
  subject: string,
): Promise<Booking[]> {
  // Nadie a quien ponerle cara: ni siquiera pedimos el token.
  if (!bookings.some((b) => b.attendees?.some((a) => !a.external))) return bookings

  let directory: Map<string, DirectoryPerson>
  try {
    directory = await getDirectory(subject)
  } catch (err) {
    console.warn('No se pudo leer el directorio; las reservas van sin fotos.', err)
    return bookings
  }

  return bookings.map((booking) => {
    if (!booking.attendees?.length) return booking
    return {
      ...booking,
      attendees: booking.attendees.map((attendee) => {
        // Los externos no están en el directorio: ni se busca.
        if (attendee.external) return attendee
        const person = directory.get(attendee.email.toLowerCase())
        if (!person) return attendee
        return {
          ...attendee,
          displayName: attendee.displayName ?? person.name,
          picture: person.picture,
        }
      }),
    }
  })
}
