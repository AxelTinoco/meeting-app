import { hourAxis, toBusyBlocks } from '../lib/availability'
import type { BusyInterval } from '../lib/types'

interface AvailabilityBarProps {
  busy: BusyInterval[]
}

/** Barra horizontal del día (8:00–20:00) con los bloques ocupados marcados. */
export function AvailabilityBar({ busy }: AvailabilityBarProps) {
  const blocks = toBusyBlocks(busy)
  const axis = hourAxis()

  return (
    <div className="select-none">
      <div className="relative h-8 w-full overflow-hidden rounded-md bg-emerald-100">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="absolute top-0 h-full bg-rose-400/80"
            style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%` }}
            title={`Ocupado ${formatHour(b.startHour)}–${formatHour(b.endHour)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {axis.map((h) => (
          <span key={h}>{h}h</span>
        ))}
      </div>
    </div>
  )
}

function formatHour(h: number): string {
  const hour = Math.floor(h)
  const min = Math.round((h - hour) * 60)
  return `${hour}:${String(min).padStart(2, '0')}`
}
