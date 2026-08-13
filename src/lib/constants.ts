// Constantes de dominio compartidas cliente/servidor (sin secretos).

export const GOOGLE_WORKSPACE_DOMAIN = 'gerundio.com.mx'

export const APP_NAME = 'Gerundio · Salas'

/** Scopes de Calendar para la service account (domain-wide delegation). */
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

/**
 * Scope del directorio (People API), para las fotos de perfil del equipo.
 *
 * Va aparte de `CALENDAR_SCOPES` a propósito: Google emite el token por el conjunto
 * completo de scopes, así que un scope sin autorizar en la delegación de dominio no
 * degrada — tumba la petición entera. Separados, si falta este permiso lo único que se
 * pierde son las fotos; las reservas siguen funcionando. El costo es un token extra por
 * usuario (la cache de `service-account.ts` es por `subject|scopes`).
 */
export const DIRECTORY_SCOPES = [
  'https://www.googleapis.com/auth/directory.readonly',
]
