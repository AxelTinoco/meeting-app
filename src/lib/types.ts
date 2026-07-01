// Tipos de dominio compartidos entre servidor y cliente.
// Las salas viven en Google (Calendar Resources) y las reservas son eventos de Calendar.

/** Posición/tamaño de una sala dentro del lienzo del mapa (en % del área visible). */
export interface RoomMapPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface Room {
  /** ID de la sala = email del recurso en Calendar (ej. sala-a@gerundio.mx) */
  resourceEmail: string
  name: string
  capacity?: number
  building?: string
  floor?: string
  /** Ubicación en el mapa espacial del dashboard. */
  map?: RoomMapPosition
}

/** Datos editables de una sala (para crear/editar). El `resourceEmail` se deriva del nombre al crear. */
export interface RoomInput {
  name: string
  capacity?: number
  building?: string
  floor?: string
}

export type MeetingType = 'interno' | 'cliente' | 'entrevista' | 'otro'

/** Payload que envía el cliente para crear una reserva. */
export interface BookingInput {
  roomEmail: string
  title: string
  /** Campo custom para reservas de cliente externo (se guarda en extendedProperties). */
  clientName?: string
  meetingType?: MeetingType
  attendeeCount?: number
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
  startTime: string
  endTime: string
  organizerEmail: string
  /** Link al evento en la UI de Google Calendar (si aplica). */
  htmlLink?: string
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
