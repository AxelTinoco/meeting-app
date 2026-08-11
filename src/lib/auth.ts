// Stub de sesión de usuario.
//
// TODO (roadmap paso 5): reemplazar por sesión OAuth real de Google restringida al
// dominio de Gerundio (parámetro `hd=<dominio>`). El email del usuario logueado se
// usa como `subject` para impersonation vía domain-wide delegation, de modo que las
// acciones queden registradas como hechas por esa persona y no por la service account.

import { GOOGLE_WORKSPACE_DOMAIN } from './constants'
import { getDevUserEmail } from './env'

export interface SessionUser {
  email: string
  name: string
  picture?: string
}

const DEMO_USER: SessionUser = {
  email: `demo@${GOOGLE_WORKSPACE_DOMAIN}`,
  name: 'Usuario Demo',
}

/** "axel.tinoco@<dominio>" → "Axel Tinoco" (nombre presentable sin depender de OAuth). */
function nameFromEmail(email: string): string {
  return (
    email
      .split('@')[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || email
  )
}

/**
 * Usuario actual. Por ahora: `DEV_USER_EMAIL` si está configurado, si no el usuario demo.
 *
 * Con credenciales reales de Google, este email es el `subject` de impersonation, así que
 * tiene que ser un usuario existente del dominio. Se reemplazará con la sesión OAuth.
 */
export function getCurrentUser(): SessionUser {
  const email = getDevUserEmail()
  if (!email || !isDomainUser(email)) return DEMO_USER
  return { email, name: nameFromEmail(email) }
}

/** Valida que un email pertenezca al dominio de Gerundio. */
export function isDomainUser(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)
}
