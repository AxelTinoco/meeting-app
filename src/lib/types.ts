// Tipos de dominio compartidos entre servidor y cliente.
// Las salas viven en Google (Calendar Resources) y las reservas son eventos de Calendar.

import type { Role } from './roles.config'

/**
 * Usuario logueado. Vive aquí (y no en `session.ts`) para que el cliente pueda
 * importarlo sin arrastrar los módulos de servidor.
 */
export interface SessionUser {
  email: string
  name: string
  picture?: string
}

/**
 * Usuario logueado con su rol resuelto.
 *
 * El rol no vive en la cookie: se calcula en cada petición desde `roles.config.ts`, así
 * que un cambio de permisos aplica sin esperar a que caduque la sesión.
 */
export type CurrentUser = SessionUser & { role: Role }

/** Posición/tamaño de una sala dentro del lienzo del mapa (en % del área visible). */
export interface RoomMapPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface Room {
  /** ID de la sala = email del recurso en Calendar (ej. c_1885…@resource.calendar.google.com) */
  resourceEmail: string
  name: string
  capacity?: number
  building?: string
  floor?: string
  /**
   * Descripción corta y humana del lugar, para quien nunca ha venido.
   * `building`/`floor` son identificadores internos ("Gerundio-HQ", "PH") y no le dicen
   * nada a un invitado externo; esto sí ("Terraza techada, último piso").
   */
  description?: string
  /** Cómo llegar: acceso, recepción, elevador. Texto libre, puede ser multilínea. */
  directions?: string
  /** Dirección postal, para el invitado externo y para abrir Maps. */
  address?: string
  /** Ubicación en el mapa espacial del dashboard. */
  map?: RoomMapPosition
  /** Ícono cuadrado de la sala (`public/icons/rooms/*.svg`), fondo oscuro incluido. */
  icon?: string
}

/** Datos editables de una sala (para crear/editar). El `resourceEmail` se deriva del nombre al crear. */
export interface RoomInput {
  name: string
  capacity?: number
  building?: string
  floor?: string
  description?: string
  directions?: string
  address?: string
}

export type MeetingType = 'interno' | 'cliente' | 'entrevista' | 'otro'

/** Payload que envía el cliente para crear una reserva. */
export interface BookingInput {
  roomEmail: string
  title: string
  /** Campo custom para reservas de cliente externo (se guarda en extendedProperties). */
  clientName?: string
  meetingType?: MeetingType
  /** Headcount informativo (para juntas donde no se invita a cada persona por correo). */
  attendeeCount?: number
  /**
   * Correos invitados a la junta. Pueden ser del dominio o externos; Google les manda
   * la invitación. NO incluye al organizador ni a la sala: esos se agregan solos.
   */
  attendees?: string[]
  /**
   * Si es true, la junta lleva sala virtual de Google Meet.
   *
   * Al crear, Google genera la liga; al editar, activarlo la crea y desactivarlo la
   * quita. Si ya existía y sigue activo, la liga NO se regenera (los invitados ya la
   * tienen en su invitación).
   */
  withMeet?: boolean
  /** ISO 8601 con offset (ej. 2026-07-01T13:00:00-06:00) */
  startTime: string
  /** ISO 8601 con offset */
  endTime: string
  /** Quién reserva (del login OAuth). En la API real se usa para impersonation. */
  organizerEmail: string
}

/** Reserva ya materializada como evento de Calendar. */
export interface Booking {
  eventId: string
  roomEmail: string
  title: string
  clientName?: string
  meetingType?: MeetingType
  attendeeCount?: number
  /** Invitados (sin la sala ni el organizador), con su respuesta a la invitación. */
  attendees?: BookingAttendee[]
  /**
   * Respuesta de la sala a la invitación. Google tarda ~15s en contestar, así que una
   * reserva recién hecha aparece como `needsAction` hasta que el recurso confirma.
   */
  roomResponse?: AttendeeResponse
  startTime: string
  endTime: string
  organizerEmail: string
  /** Link al evento en la UI de Google Calendar (si aplica). */
  htmlLink?: string
  /**
   * Liga para entrar por videollamada (Google Meet), si la junta tiene sala virtual.
   *
   * Puede faltar durante unos segundos en una junta recién creada: Google a veces
   * devuelve la conferencia en estado `pending` y la liga aparece al recargar.
   */
  meetLink?: string
}

export type AttendeeResponse =
  'accepted' | 'declined' | 'tentative' | 'needsAction'

export interface BookingAttendee {
  email: string
  displayName?: string
  response: AttendeeResponse
  /** true si el correo no pertenece al dominio de Gerundio. */
  external: boolean
  /**
   * Foto de perfil del directorio de Workspace. No viene de Calendar: se cruza por correo
   * contra la People API (ver `google/directory-api.ts`). Solo la tiene gente del dominio
   * que subió foto; para el resto la UI cae a las iniciales.
   */
  picture?: string
}

/** Intervalo ocupado devuelto por freebusy. */
export interface BusyInterval {
  start: string
  end: string
}

export interface RoomAvailability {
  roomEmail: string
  busy: BusyInterval[]
}

/** Rango de fechas ISO para consultas de disponibilidad. */
export interface DateRange {
  timeMin: string
  timeMax: string
}
