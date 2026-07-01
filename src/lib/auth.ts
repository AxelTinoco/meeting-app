// Stub de sesión de usuario.
//
// TODO (roadmap paso 5): reemplazar por sesión OAuth real de Google restringida al
// dominio de Gerundio (parámetro `hd=gerundio.mx`). El email del usuario logueado se
// usa como `subject` para impersonation vía domain-wide delegation, de modo que las
// acciones queden registradas como hechas por esa persona y no por la service account.

import { GOOGLE_WORKSPACE_DOMAIN } from './constants'

export interface SessionUser {
  email: string
  name: string
  picture?: string
}

const DEMO_USER: SessionUser = {
  email: `demo@${GOOGLE_WORKSPACE_DOMAIN}`,
  name: 'Usuario Demo',
}

/** Usuario actual. Por ahora devuelve un usuario demo; se reemplazará con la sesión OAuth. */
export function getCurrentUser(): SessionUser {
  return DEMO_USER
}

/** Valida que un email pertenezca al dominio de Gerundio. */
export function isDomainUser(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)
}
