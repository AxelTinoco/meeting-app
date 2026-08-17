import { Avatar } from './Avatar'
import type { BookingAttendee } from '../lib/types'

interface AttendeeStackProps {
  attendees?: BookingAttendee[]
  /** Lado de cada cara en px. Va en `style`: Tailwind no genera tamaños dinámicos. */
  size?: number
  /** Cuántas caras caben antes de resumir con "+N". */
  max?: number
  className?: string
}

/**
 * Pila de caras superpuestas. El anillo blanco es lo que separa una foto de la siguiente.
 *
 * Todo son `span`: además del riel, esto vive dentro del botón de una sala del mapa
 * (ver `RoomTile`), y un botón solo admite contenido de frase.
 */
export function AttendeeStack({
  attendees,
  size = 22,
  max = 4,
  className = '',
}: AttendeeStackProps) {
  if (!attendees?.length) return null

  const shown = attendees.slice(0, max)
  const rest = attendees.length - shown.length

  return (
    <span className={`flex shrink-0 items-center -space-x-1.5 ${className}`}>
      {shown.map((a) => (
        <Avatar
          key={a.email}
          email={a.email}
          name={a.displayName}
          picture={a.picture}
          size={size}
          // Aquí el avatar va solo, sin el nombre al lado: sin `alt` un lector de
          // pantalla no diría a quién corresponde la cara.
          alt={a.displayName ?? a.email}
          className="ring-2 ring-white"
        />
      ))}
      {rest > 0 && (
        <span
          title={attendees
            .slice(max)
            .map((a) => a.displayName ?? a.email)
            .join(', ')}
          style={{
            width: size,
            height: size,
            fontSize: Math.max(9, Math.round(size * 0.38)),
          }}
          className="flex shrink-0 items-center justify-center rounded-full bg-ink-200 font-semibold leading-none text-ink-600 ring-2 ring-white"
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
