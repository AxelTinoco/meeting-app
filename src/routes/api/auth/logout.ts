// Cierre de sesión.
//
// Solo POST: con GET, cualquier <img src="/api/auth/logout"> en otra página sacaría al
// usuario de la app. El botón del sidebar es un <form method="post">.

import { createFileRoute } from '@tanstack/react-router'
import { clearSessionUser } from '../../../lib/session'
import { redirectResponse } from '../../../lib/http'

export const Route = createFileRoute('/api/auth/logout')({
  server: {
    handlers: {
      POST: async () => {
        await clearSessionUser()
        return redirectResponse('/login')
      },
      GET: () =>
        new Response('Usa POST para cerrar sesión.', {
          status: 405,
          headers: { allow: 'POST' },
        }),
    },
  },
})
