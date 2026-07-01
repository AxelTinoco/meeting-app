// Helpers de presentación para la grilla de disponibilidad (client-safe).

import { DAY_START_HOUR, DAY_END_HOUR, mxHourFloat } from './mexico-time'
import type { BusyInterval } from './types'

const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR

export interface BusyBlock {
  startHour: number
  endHour: number
  /** posición como % del ancho de la barra */
  leftPct: number
  widthPct: number
}

function clampHour(h: number): number {
  return Math.min(DAY_END_HOUR, Math.max(DAY_START_HOUR, h))
}

/** Convierte intervalos ocupados (ISO) en bloques posicionados dentro de la barra del día. */
export function toBusyBlocks(busy: BusyInterval[]): BusyBlock[] {
  const blocks: BusyBlock[] = []
  for (const interval of busy) {
    let start = mxHourFloat(interval.start)
    let end = mxHourFloat(interval.end)
    // Evento que cruza medianoche o termina al día siguiente.
    if (end <= start) end = DAY_END_HOUR
    start = clampHour(start)
    end = clampHour(end)
    if (end <= start) continue
    blocks.push({
      startHour: start,
      endHour: end,
      leftPct: ((start - DAY_START_HOUR) / TOTAL_HOURS) * 100,
      widthPct: ((end - start) / TOTAL_HOURS) * 100,
    })
  }
  return blocks
}

/** Etiquetas del eje de horas (cada 2h). */
export function hourAxis(step = 2): number[] {
  const hours: number[] = []
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += step) hours.push(h)
  return hours
}

/** ¿La sala está libre en este momento? (para el badge de estado) */
export function isBusyNow(busy: BusyInterval[], now: Date = new Date()): boolean {
  const iso = now.toISOString()
  return busy.some((b) => b.start <= iso && iso < b.end)
}
