// Reglas de permisos, sin dependencias de servidor.
//
// Vive aparte de `auth.ts` (que abre la sesión y por tanto solo corre en el servidor)
// para que los componentes puedan usar las mismas reglas al decidir qué botones pintar.
// Ojo: esto es solo la UI. Quien decide de verdad son las server functions.

import { GOOGLE_WORKSPACE_DOMAIN } from './constants'
import type { CurrentUser } from './types'

/** Valida que un email pertenezca al dominio de Gerundio. */
export function isDomainUser(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GOOGLE_WORKSPACE_DOMAIN}`)
}

/**
 * ¿Puede este usuario editar o cancelar esta reserva?
 *
 * Dueño o admin. El caso raro es el tercero: las reservas creadas antes del cambio de
 * modelo (2026-08-11) tienen a la SALA como organizadora, así que su dueño real es
 * indeterminable; ahí se deja pasar a cualquiera del dominio, que es como se comportaba
 * la app hasta ahora, en vez de dejarlas incancelables.
 */
export function canManageBooking(
  user: CurrentUser,
  organizerEmail: string,
): boolean {
  if (user.role === 'admin') return true
  if (!isDomainUser(organizerEmail)) return true
  return organizerEmail.toLowerCase() === user.email.toLowerCase()
}
