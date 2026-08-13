import { useState } from 'react'

interface AvatarProps {
  email: string
  name?: string
  /** Foto del directorio de Workspace. Sin ella (o si falla al cargar) van las iniciales. */
  picture?: string
  /** Lado en px. Va en `style` y no en clases: Tailwind no genera tamaños dinámicos. */
  size?: number
  /**
   * Texto alternativo. Vacío por defecto porque casi siempre el nombre ya está escrito al
   * lado; solo se llena cuando el avatar va solo (p. ej. la pila de la agenda).
   */
  alt?: string
  className?: string
}

/** Iniciales de respaldo: del nombre si lo hay, si no del usuario del correo. */
export function initials(name: string | undefined, email: string): string {
  const source = name?.trim() || email.split('@')[0].replace(/[._-]+/g, ' ')
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || '?'
  )
}

/** Foto de perfil circular con caída a iniciales. */
export function Avatar({
  email,
  name,
  picture,
  size = 32,
  alt = '',
  className = '',
}: AvatarProps) {
  // Una URL de Google puede dejar de servir (foto borrada, sesión sin permiso). Sin esto
  // el navegador pintaría el icono de imagen rota en vez de las iniciales.
  const [failed, setFailed] = useState(false)

  const box = { width: size, height: size }
  const title = name || email

  if (picture && !failed) {
    return (
      <img
        src={picture}
        alt={alt}
        title={title}
        // Sin esto googleusercontent responde 403 a las fotos de perfil.
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      style={{ ...box, fontSize: Math.max(9, Math.round(size * 0.38)) }}
      title={title}
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      className={`flex shrink-0 items-center justify-center rounded-full bg-ink-300 font-semibold leading-none text-ink-600 ${className}`}
    >
      {initials(name, email)}
    </span>
  )
}
