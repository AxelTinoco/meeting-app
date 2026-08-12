// Acceso a variables de entorno del servidor.
//
// En dev (Node) y en Cloudflare Workers con `nodejs_compat` + fecha de compatibilidad
// reciente, las `vars`/secrets se reflejan en `process.env`. Este módulo es el único
// lugar que las lee, para facilitar cablear las credenciales reales después.

function readEnv(key: string): string | undefined {
  // @types/node declara `process.env` como siempre presente, pero en un Worker sin
  // `nodejs_compat` puede no estarlo: leemos desde globalThis con un tipo honesto.
  const g = globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }
  return g.process?.env?.[key]
}

export interface GoogleServiceAccount {
  serviceAccountEmail: string
  /** Private key PEM (PKCS#8). Los `\n` escapados se normalizan a saltos de línea reales. */
  privateKey: string
  workspaceDomain: string
}

/**
 * Devuelve las credenciales de la service account o lanza si faltan.
 * Solo debe llamarse cuando `hasGoogleCredentials()` es true.
 */
export function getGoogleServiceAccount(): GoogleServiceAccount {
  const serviceAccountEmail = readEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const rawKey = readEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  const workspaceDomain = readEnv('GOOGLE_WORKSPACE_DOMAIN') ?? ''

  if (!serviceAccountEmail || !rawKey) {
    throw new Error(
      'Faltan credenciales de Google: GOOGLE_SERVICE_ACCOUNT_EMAIL y/o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
    )
  }

  return {
    serviceAccountEmail,
    privateKey: rawKey.replace(/\\n/g, '\n'),
    workspaceDomain,
  }
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  /** Sobrescribe la URI de callback; si no está, se deriva del host de la petición. */
  redirectUri?: string
}

/**
 * Credenciales del OAuth client (login del equipo). Lanza si faltan.
 *
 * Es un client de tipo "web": el secret vive solo en el servidor, nunca se manda al
 * navegador. Los redirect URIs tienen que estar dados de alta en Google Cloud Console.
 */
export function getGoogleOAuth(): GoogleOAuthConfig {
  const clientId = readEnv('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = readEnv('GOOGLE_OAUTH_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error(
      'Faltan credenciales de OAuth: GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET.',
    )
  }

  return {
    clientId,
    clientSecret,
    redirectUri: readEnv('GOOGLE_OAUTH_REDIRECT_URI')?.trim() || undefined,
  }
}

/** Longitud mínima del secreto de sesión que exige el sellado de la cookie. */
const SESSION_SECRET_MIN_LENGTH = 32

/**
 * Secreto con el que se cifra y firma la cookie de sesión.
 *
 * Cambiarlo invalida todas las sesiones activas (que es justo lo que se quiere si
 * alguna vez se filtra). Genera uno con `openssl rand -base64 48`.
 */
export function getSessionSecret(): string {
  const secret = readEnv('SESSION_SECRET')?.trim()
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(
      `Falta SESSION_SECRET o es demasiado corto (mínimo ${SESSION_SECRET_MIN_LENGTH} caracteres). Genera uno con \`openssl rand -base64 48\`.`,
    )
  }
  return secret
}

/** true si hay credenciales de service account configuradas (activa la integración real). */
export function hasGoogleCredentials(): boolean {
  return Boolean(
    readEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL') &&
      readEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'),
  )
}
