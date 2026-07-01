// Autenticación de service account compatible con Cloudflare Workers.
//
// En vez de `googleapis` (pesado y con fricción en Workers), firmamos el JWT con Web Crypto
// (RSASSA-PKCS1-v1_5 / SHA-256) y lo intercambiamos por un access token. El claim incluye
// `sub` = email del usuario a impersonar (domain-wide delegation).

import { getGoogleServiceAccount } from '../env'

interface TokenCacheEntry {
  token: string
  /** epoch seconds */
  expiresAt: number
}

// Cache de tokens por (subject + scopes). Best-effort: el estado de módulo puede
// reiniciarse entre invocaciones del worker, pero ahorra intercambios dentro de una misma.
const tokenCache = new Map<string, TokenCacheEntry>()

function b64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function encodeSegment(obj: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)))
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function signJwt(
  claim: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const signingInput = `${encodeSegment(header)}.${encodeSegment(claim)}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  )
  return `${signingInput}.${b64url(new Uint8Array(signature))}`
}

/**
 * Obtiene un access token de Google impersonando a `subject` con los `scopes` dados.
 * Cachea el token hasta su expiración (con margen de 60s).
 */
export async function getAccessToken(
  subject: string,
  scopes: string[],
): Promise<string> {
  const cacheKey = `${subject}|${scopes.join(' ')}`
  const now = Math.floor(Date.now() / 1000)

  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > now + 60) {
    return cached.token
  }

  const sa = getGoogleServiceAccount()
  const jwt = await signJwt(
    {
      iss: sa.serviceAccountEmail,
      sub: subject,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    sa.privateKey,
  )

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    throw new Error(
      `Fallo al intercambiar el JWT por access token (${res.status}): ${await res.text()}`,
    )
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: now + data.expires_in,
  })
  return data.access_token
}
