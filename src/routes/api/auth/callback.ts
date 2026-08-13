// Paso 2 del login: Google regresa aquí con el `code`.
//
// Cualquier fallo termina en /login con un motivo legible; los detalles técnicos van al
// log del servidor y no a la URL, para no filtrar nada al navegador.

import { createFileRoute } from '@tanstack/react-router'
import { DomainNotAllowedError, exchangeCodeForUser } from '../../../lib/google/oauth'
import { getGoogleOAuth } from '../../../lib/env'
import { consumeOAuthFlow, writeSessionUser } from '../../../lib/session'
import {
  redirectResponse,
  resolveCallbackUri,
  withSearchParam,
} from '../../../lib/http'
import { WELCOME_PARAM, WELCOME_VALUE } from '../../../lib/welcome'

/** Motivos que entiende la pantalla de login. */
type LoginError = 'cancelado' | 'estado' | 'dominio' | 'google'

function backToLogin(error: LoginError): Response {
  return redirectResponse(`/login?error=${error}`)
}

export const Route = createFileRoute('/api/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams

        // El `state` se consume siempre, aunque el intento falle: un `state` usado no
        // debe poder reutilizarse en un segundo callback.
        const flow = await consumeOAuthFlow()

        if (params.get('error')) return backToLogin('cancelado')

        const code = params.get('code')
        const state = params.get('state')
        if (!code || !state || !flow || flow.state !== state) {
          return backToLogin('estado')
        }

        const { clientId, clientSecret, redirectUri } = getGoogleOAuth()

        try {
          const user = await exchangeCodeForUser({
            code,
            clientId,
            clientSecret,
            redirectUri: resolveCallbackUri(redirectUri),
            expectedNonce: flow.nonce,
          })
          await writeSessionUser(user)
          // La marca de bienvenida distingue "acabo de entrar" de "recargué la página":
          // es lo único que sabe el destino para animar la entrada. El propio tablero la
          // borra de la URL en cuanto hidrata, así que no sobrevive a un F5.
          return redirectResponse(
            withSearchParam(flow.redirectTo, WELCOME_PARAM, WELCOME_VALUE),
          )
        } catch (error) {
          if (error instanceof DomainNotAllowedError) return backToLogin('dominio')
          console.error('[auth] falló el callback de OAuth:', error)
          return backToLogin('google')
        }
      },
    },
  },
})
