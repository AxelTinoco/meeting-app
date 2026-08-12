// Paso 1 del login: manda al usuario a Google.

import { createFileRoute } from '@tanstack/react-router'
import { buildAuthorizeUrl, randomToken } from '../../../lib/google/oauth'
import { getGoogleOAuth } from '../../../lib/env'
import { writeOAuthFlow } from '../../../lib/session'
import { redirectResponse, resolveCallbackUri, safeInternalPath } from '../../../lib/http'

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { clientId, redirectUri } = getGoogleOAuth()
        const url = new URL(request.url)

        const state = randomToken()
        const nonce = randomToken()

        // `state` y `nonce` se guardan en una cookie corta y sellada: son lo que permite
        // comprobar en el callback que la vuelta corresponde a este mismo login.
        await writeOAuthFlow({
          state,
          nonce,
          redirectTo: safeInternalPath(url.searchParams.get('redirect')),
        })

        return redirectResponse(
          buildAuthorizeUrl({
            clientId,
            redirectUri: resolveCallbackUri(redirectUri),
            state,
            nonce,
          }),
        )
      },
    },
  },
})
