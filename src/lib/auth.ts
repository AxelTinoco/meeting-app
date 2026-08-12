// Sesión del usuario, del lado del servidor.
//
// El email que sale de aquí es el `subject` de la impersonation vía domain-wide
// delegation: las acciones en Calendar quedan registradas como hechas por esa persona
// y no por la service account. Por eso solo puede venir de una sesión verificada,
// nunca de un dato que mande el cliente.

import { isDomainUser } from './permissions'
import { roleFor } from './roles.config'
import { readSessionUser } from './session'
import type { CurrentUser, SessionUser } from './types'

export type { CurrentUser, SessionUser }
// Las reglas de permisos viven en `permissions.ts` (sin dependencias de servidor) para
// que la UI pueda aplicarlas también; se reexportan para no tener dos puertas de entrada.
export { canManageBooking, isDomainUser } from './permissions'

/** Se lanza cuando una operación necesita sesión y no hay. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('Necesitas iniciar sesión con tu cuenta de Gerundio.')
    this.name = 'NotAuthenticatedError'
  }
}

/** Se lanza cuando hay sesión pero el rol no alcanza. */
export class NotAuthorizedError extends Error {
  constructor(message = 'No tienes permiso para hacer esto.') {
    super(message)
    this.name = 'NotAuthorizedError'
  }
}

/** Usuario logueado con su rol, o `null` si la petición no trae sesión válida. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await readSessionUser()
  // Cinturón y tirantes: si el dominio cambiara, las sesiones viejas dejan de valer.
  if (!user || !isDomainUser(user.email)) return null
  return { ...user, role: roleFor(user.email) }
}

/** Igual que `getCurrentUser`, pero lanza si no hay sesión. Úsalo en server functions. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new NotAuthenticatedError()
  return user
}

/** Exige rol admin. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw new NotAuthorizedError('Solo un administrador de Salas puede hacer esto.')
  }
  return user
}

