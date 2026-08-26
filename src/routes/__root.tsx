import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { MotionConfig } from 'motion/react'

import { getSessionUserFn } from '../server/auth'
import appCss from '../styles.css?url'

/** Rutas que no exigen sesión (si no, el login sería un ciclo de redirecciones). */
function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/')
}

export const Route = createRootRoute({
  // Puerta única de la app: sin sesión no se llega a ninguna ruta. Las server functions
  // vuelven a comprobarlo por su cuenta, porque esto solo protege la navegación.
  beforeLoad: async ({ location }) => {
    if (isPublicPath(location.pathname)) return { user: null }

    const user = await getSessionUserFn()
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Gerundio · Salas',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // El isotipo de Gerundio como icono del sitio. El .ico va primero para los
      // navegadores viejos que solo miran ese; los modernos se quedan con el PNG.
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', type: 'image/png', href: '/icons/brand/isotipo-32.png' },
      { rel: 'apple-touch-icon', href: '/icons/brand/isotipo-192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* `reducedMotion="user"`: con "Reducir movimiento" activado en el
            sistema, motion desactiva transform y layout en toda la app y deja
            solo los fundidos de opacidad. Se resuelve una vez aquí para que
            ningún componente tenga que acordarse de comprobarlo. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
