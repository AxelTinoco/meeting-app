import type { DateRange } from './types'

// Gerundio opera en CDMX. México ya no aplica horario de verano desde 2022,
// así que el offset es constante -06:00 y podemos construir ISO strings sin ambigüedad.
export const MX_TZ = 'America/Mexico_City'
export const MX_OFFSET = '-06:00'

/** Hora de apertura/cierre visible en la grilla de disponibilidad. */
export const DAY_START_HOUR = 8
export const DAY_END_HOUR = 20

/** Devuelve la fecha (YYYY-MM-DD) en zona horaria de CDMX. */
export function mxISODate(date: Date = new Date()): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MX_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Construye un ISO 8601 con offset de CDMX para una fecha + hora dadas. */
export function mxDateTime(isoDate: string, hour: number, minute = 0): string {
  const hh = String(hour).padStart(2, '0')
  const mm = String(minute).padStart(2, '0')
  return `${isoDate}T${hh}:${mm}:00${MX_OFFSET}`
}

/** Hora local de CDMX (con fracción de minutos) de un instante ISO. */
export function mxHourFloat(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MX_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  // '24' aparece a medianoche en algunos runtimes; normalizamos a 0.
  return (h % 24) + m / 60
}

/** Formatea un ISO como "13:00" en hora de CDMX. */
export function mxTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MX_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/** Combina una fecha (YYYY-MM-DD) y hora (HH:MM) de inputs nativos en un ISO con offset CDMX. */
export function mxISO(dateYYYYMMDD: string, timeHHMM: string): string {
  return `${dateYYYYMMDD}T${timeHHMM}:00${MX_OFFSET}`
}

/** Descompone un ISO en los valores que esperan los inputs nativos <date>/<time> en hora CDMX. */
export function mxInputParts(iso: string): { date: string; time: string } {
  return { date: mxISODate(new Date(iso)), time: mxTimeLabel(iso) }
}

/** Rango [00:00, 24:00) de un día en CDMX. */
export function mxDayRange(base: Date = new Date()): DateRange {
  const today = mxISODate(base)
  const tomorrow = mxISODate(new Date(base.getTime() + 24 * 60 * 60 * 1000))
  return { timeMin: mxDateTime(today, 0), timeMax: mxDateTime(tomorrow, 0) }
}
