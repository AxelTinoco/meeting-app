// Utilidades de las rutas de servidor (`src/routes/api/**`).

import { getRequestUrl } from '@tanstack/react-start/server'

/**
 * Respuesta 302.
 *
 * Se arma a mano en vez de con `Response.redirect` porque este acepta rutas relativas
 * y, sobre todo, porque el framework solo fusiona las cookies pendientes (sesión) en
 * respuestas que no son 2xx — que es justo el caso de un redirect.
 */
export function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { location } })
}

/**
 * Sanea un destino de redirección que viene del querystring.
 *
 * Solo se aceptan rutas internas: un `//evil.com` o un `https://evil.com` convertirían
 * el login en un open redirect.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = '/',
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

/** URI de callback de OAuth: la del env si está fijada, o la del host de la petición. */
export function resolveCallbackUri(override?: string): string {
  return override || new URL('/api/auth/callback', getRequestUrl()).toString()
}
