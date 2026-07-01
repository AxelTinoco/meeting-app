// Constantes de dominio compartidas cliente/servidor (sin secretos).

export const GOOGLE_WORKSPACE_DOMAIN = 'gerundio.mx'

export const APP_NAME = 'Gerundio · Salas'

/** Scopes de Calendar para la service account (domain-wide delegation). */
export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]
