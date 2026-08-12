// Sesión del usuario en una cookie sellada (cifrada + firmada) por TanStack Start.
//
// No hace falta almacén externo: los datos viajan dentro de la cookie, que el navegador
// no puede leer ni modificar sin SESSION_SECRET. La contrapartida es que no hay
// revocación central; la sesión muere por expiración o al cambiar el secreto.

import { getCookie, getRequestUrl, useSession } from '@tanstack/react-start/server'
import { getSessionSecret } from './env'
import type { SessionUser } from './types'

interface SessionData {
  user: SessionUser
}

/** Estado temporal del handshake de OAuth (anti-CSRF + a dónde volver). */
export interface OAuthFlowData {
  /** Anti-CSRF: se compara con el `state` que devuelve Google. */
  state: string
  /** Anti-replay: debe coincidir con el claim `nonce` del id_token. */
  nonce: string
  redirectTo: string
}

const SESSION_NAME = 'gerundio_salas'
const OAUTH_FLOW_NAME = 'gerundio_oauth'

const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 días
const OAUTH_FLOW_MAX_AGE = 60 * 10 // 10 minutos: solo dura el ida y vuelta a Google

function cookieOptions(maxAge: number) {
  return {
    // En localhost el navegador rechaza cookies `Secure` sobre http://.
    secure: getRequestUrl().protocol === 'https:',
    httpOnly: true,
    // `lax` (no `strict`): la vuelta desde Google es una navegación cross-site, y con
    // `strict` el navegador no mandaría la cookie y el callback perdería el `state`.
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

function sessionConfig(name: string, maxAge: number) {
  return {
    name,
    password: getSessionSecret(),
    maxAge,
    cookie: cookieOptions(maxAge),
  }
}

/** Usuario de la sesión actual, o `null` si no hay sesión válida. */
export async function readSessionUser(): Promise<SessionUser | null> {
  // Salida temprana sin tocar `useSession`: abrirla crea una sesión vacía y manda una
  // cookie inútil en cada visita anónima.
  if (!getCookie(SESSION_NAME)) return null

  const session = await useSession<SessionData>(
    sessionConfig(SESSION_NAME, SESSION_MAX_AGE),
  )
  const user = session.data.user
  return user?.email ? user : null
}

/** Abre la sesión (login exitoso). */
export async function writeSessionUser(user: SessionUser): Promise<void> {
  const session = await useSession<SessionData>(
    sessionConfig(SESSION_NAME, SESSION_MAX_AGE),
  )
  await session.update({ user })
}

/** Cierra la sesión (logout). */
export async function clearSessionUser(): Promise<void> {
  const session = await useSession<SessionData>(
    sessionConfig(SESSION_NAME, SESSION_MAX_AGE),
  )
  await session.clear()
}

/** Guarda el `state` de OAuth antes de mandar al usuario a Google. */
export async function writeOAuthFlow(data: OAuthFlowData): Promise<void> {
  const flow = await useSession<OAuthFlowData>(
    sessionConfig(OAUTH_FLOW_NAME, OAUTH_FLOW_MAX_AGE),
  )
  await flow.update(data)
}

/**
 * Consume el `state` guardado: lo devuelve y lo borra en el mismo paso, para que un
 * `state` no pueda reutilizarse en un segundo callback.
 */
export async function consumeOAuthFlow(): Promise<OAuthFlowData | null> {
  if (!getCookie(OAUTH_FLOW_NAME)) return null

  const flow = await useSession<OAuthFlowData>(
    sessionConfig(OAUTH_FLOW_NAME, OAUTH_FLOW_MAX_AGE),
  )
  const { state, nonce, redirectTo } = flow.data
  await flow.clear()
  return state && nonce ? { state, nonce, redirectTo: redirectTo || '/' } : null
}
