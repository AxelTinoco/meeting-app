// Quién es admin de Salas.
//
// Fuente de verdad en código, no en base de datos: son un par de personas y cambiarlo es
// un commit. Si algún día IT prefiere administrarlo desde la Admin Console, el reemplazo
// natural es un grupo de Workspace (salas-admins@gerundio.com.mx) leído con la misma
// service account; `roleFor()` seguiría siendo el único punto que hay que cambiar.
//
// El rol NO se guarda en la cookie de sesión: se calcula en cada petición a partir de
// esta lista, así que quitarle admin a alguien surte efecto sin esperar a que caduque
// su sesión.

/**
 * - `admin`: gestiona salas y puede editar o cancelar reservas de cualquiera.
 * - `miembro`: reserva, y gestiona únicamente lo suyo. Es el rol por defecto de
 *   cualquier persona del dominio.
 */
export type Role = 'admin' | 'miembro'

/** Correos con rol admin. En minúsculas. */
const ADMIN_EMAILS = ['axel@gerundio.com.mx']

const ADMINS = new Set(ADMIN_EMAILS.map((email) => email.toLowerCase()))

/** Rol de un usuario del dominio. Todo el que entra es al menos `miembro`. */
export function roleFor(email: string): Role {
  return ADMINS.has(email.toLowerCase()) ? 'admin' : 'miembro'
}

export function isAdminEmail(email: string): boolean {
  return roleFor(email) === 'admin'
}
