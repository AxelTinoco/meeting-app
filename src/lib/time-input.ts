import { DAY_END_HOUR, DAY_START_HOUR, mxTimeFromMinutes } from './mexico-time'

/**
 * Interpreta lo que alguien teclea en un campo de hora y lo normaliza a "HH:MM".
 *
 * El input nativo <input type="time"> obliga a moverse por segmentos y no deja
 * escribir "930" de corrido ni pegar una hora, así que aceptamos las formas en
 * las que la gente escribe de verdad:
 *
 *   "9" → 09:00     "930" → 09:30     "9:30" → 09:30    "9.30" → 09:30
 *   "1430" → 14:30  "2 pm" → 14:00    "12am" → 00:00    "0930" → 09:30
 *
 * Devuelve null si no hay una hora válida detrás del texto; quien llama decide
 * si revierte al valor anterior o marca error.
 */
export function parseTimeInput(raw: string): string | null {
  const text = raw.trim().toLowerCase()
  if (!text) return null

  // El meridiano puede venir como "pm", "p.m." o solo "p", pegado o separado.
  const withMeridiem = /^(.*?)([ap])\.?\s*m?\.?$/.exec(text)
  const meridiem = withMeridiem?.[2]
  const digits = (withMeridiem?.[1] ?? text).replace(/\D/g, '')
  if (!digits || digits.length > 4) return null

  let hour: number
  let minute: number
  if (digits.length <= 2) {
    hour = Number(digits)
    minute = 0
  } else {
    // 3 dígitos son H:MM ("930"), 4 son HH:MM ("1430").
    hour = Number(digits.slice(0, digits.length - 2))
    minute = Number(digits.slice(-2))
  }
  if (minute > 59) return null

  if (meridiem) {
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'p' && hour !== 12) hour += 12
    if (meridiem === 'a' && hour === 12) hour = 0
  } else if (hour > 23) {
    return null
  }

  return mxTimeFromMinutes(hour * 60 + minute)
}

/** Sugerencias del datalist: cada media hora dentro del horario visible de la grilla. */
export function timeSuggestions(stepMinutes = 30): string[] {
  const out: string[] = []
  for (let m = DAY_START_HOUR * 60; m <= DAY_END_HOUR * 60; m += stepMinutes) {
    out.push(mxTimeFromMinutes(m))
  }
  return out
}
