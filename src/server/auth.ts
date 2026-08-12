// Server function de sesión: lo único que el cliente puede preguntar sobre el login.

import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '../lib/auth'

/** Usuario logueado o `null`. Devolver `null` (y no lanzar) deja que el router redirija. */
export const getSessionUserFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getCurrentUser()
})
