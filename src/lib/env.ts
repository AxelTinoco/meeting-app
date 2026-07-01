// Acceso a variables de entorno del servidor.
//
// En dev (Node) y en Cloudflare Workers con `nodejs_compat` + fecha de compatibilidad
// reciente, las `vars`/secrets se reflejan en `process.env`. Este módulo es el único
// lugar que las lee, para facilitar cablear las credenciales reales después.

function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
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

/** true si hay credenciales de service account configuradas (activa la integración real). */
export function hasGoogleCredentials(): boolean {
  return Boolean(
    readEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL') &&
      readEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'),
  )
}
