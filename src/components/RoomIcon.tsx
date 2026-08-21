interface RoomIconProps {
  /** `room.icon`; si falta (sala nueva sin ícono asignado) el componente no pinta nada. */
  src: string | undefined
  /** Lado en px. */
  size?: number
  className?: string
}

/**
 * Ícono cuadrado de una sala (`public/icons/rooms/*.svg`). A diferencia de
 * `GrndIcon`, el fondo oscuro ya viene dentro del SVG, así que se pinta como
 * imagen y no como máscara de `currentColor`.
 */
export function RoomIcon({ src, size = 32, className = '' }: RoomIconProps) {
  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  )
}
