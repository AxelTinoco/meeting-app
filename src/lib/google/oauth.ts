// OAuth 2.0 con Google, solo para IDENTIDAD.
//
// No pedimos scopes de Calendar: las llamadas al calendario siguen yendo por la service
// account con domain-wide delegation, impersonando al email de la sesión. Por eso aquí
// no se guardan access ni refresh tokens: del intercambio solo sobrevive el id_token,
// y de él solo copiamos email/nombre/foto a la cookie de sesión.

import { GOOGLE_WORKSPACE_DOMAIN } from '../constants'
import type { SessionUser } from '../types'

const AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

/** Identidad básica; sin acceso a datos del usuario más allá de su perfil. */
const OAUTH_SCOPES = 'openid email profile'

const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

/** Tolerancia de reloj al validar `exp` (los Workers pueden ir unos segundos desfasados). */
const CLOCK_SKEW_SECONDS = 60

/** El usuario se autenticó bien, pero con una cuenta que no es del dominio. */
export class DomainNotAllowedError extends Error {
  constructor(readonly attemptedEmail?: string) {
    super(`La cuenta no pertenece a @${GOOGLE_WORKSPACE_DOMAIN}.`)
    this.name = 'DomainNotAllowedError'
  }
}

interface IdTokenClaims {
  iss?: string
  aud?: string
  exp?: number
  nonce?: string
  email?: string
  email_verified?: boolean | string
  /** Dominio de Workspace. Ausente en cuentas personales de Gmail. */
  hd?: string
  name?: string
  picture?: string
}

/** Valor aleatorio para `state` / `nonce`. */
export function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function buildAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  nonce: string
  /** Sugerencia de cuenta para saltarse el selector cuando ya sabemos quién es. */
  loginHint?: string
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    state: opts.state,
    nonce: opts.nonce,
    // Filtra el selector de cuentas al dominio. Es solo una pista de UI: el usuario
    // puede quitarla de la URL, así que la validación real es el claim `hd` de abajo.
    hd: GOOGLE_WORKSPACE_DOMAIN,
    prompt: 'select_account',
    // Sin refresh token: la sesión la maneja la app, no Google.
    access_type: 'online',
  })
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`
}

/**
 * Cambia el `code` por el id_token y devuelve el usuario ya validado.
 *
 * Lanza `DomainNotAllowedError` si la cuenta no es de Gerundio, y `Error` normal si el
 * intercambio falla o el token no cuadra.
 */
export async function exchangeCodeForUser(opts: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  expectedNonce: string
}): Promise<SessionUser> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Google rechazó el intercambio de código (${response.status}): ${detail}`,
    )
  }

  const payload = (await response.json()) as { id_token?: string }
  if (!payload.id_token) {
    throw new Error('La respuesta de Google no incluye id_token.')
  }

  return userFromIdToken(payload.id_token, opts.clientId, opts.expectedNonce)
}

/**
 * Valida el id_token y lo convierte en usuario de sesión.
 *
 * No verificamos la firma contra las JWKS de Google: el token no viene del navegador
 * sino directo del endpoint de tokens por TLS, que es el caso en el que la propia
 * documentación de Google permite saltarse ese paso. Aun así validamos los claims,
 * porque de ellos depende quién entra.
 */
function userFromIdToken(
  idToken: string,
  clientId: string,
  expectedNonce: string,
): SessionUser {
  const claims = decodeJwtPayload(idToken)

  if (!claims.iss || !VALID_ISSUERS.includes(claims.iss)) {
    throw new Error('El id_token no fue emitido por Google.')
  }
  if (claims.aud !== clientId) {
    throw new Error('El id_token fue emitido para otra aplicación.')
  }
  if (!claims.exp || claims.exp + CLOCK_SKEW_SECONDS < Math.floor(Date.now() / 1000)) {
    throw new Error('El id_token está vencido.')
  }
  if (claims.nonce !== expectedNonce) {
    throw new Error('El nonce del id_token no coincide con el de esta sesión.')
  }

  const email = claims.email?.trim().toLowerCase()
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true'
  if (!email || !emailVerified) {
    throw new Error('Google no confirmó el correo de la cuenta.')
  }

  // La puerta del dominio. `hd` solo existe en cuentas de Workspace, así que una cuenta
  // personal (aunque su correo terminara igual) no pasa de aquí.
  const domain = GOOGLE_WORKSPACE_DOMAIN.toLowerCase()
  if (claims.hd?.toLowerCase() !== domain || !email.endsWith(`@${domain}`)) {
    throw new DomainNotAllowedError(email)
  }

  return {
    email,
    name: claims.name?.trim() || email,
    picture: claims.picture,
  }
}

/** Decodifica el payload (base64url) de un JWT. No verifica la firma. */
function decodeJwtPayload(token: string): IdTokenClaims {
  const segment = token.split('.')[1]
  if (!segment) throw new Error('id_token con formato inválido.')

  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  try {
    // TextDecoder y no atob a secas: los nombres con acentos vienen en UTF-8.
    return JSON.parse(new TextDecoder().decode(bytes)) as IdTokenClaims
  } catch {
    throw new Error('No se pudo leer el contenido del id_token.')
  }
}
