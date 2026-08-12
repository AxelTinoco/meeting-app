import { createFileRoute } from '@tanstack/react-router'
import { GrndIcon } from '../components/GrndIcon'
import { GOOGLE_WORKSPACE_DOMAIN } from '../lib/constants'

/** Motivos que manda el callback en `?error=`. */
const ERROR_MESSAGES: Record<string, string> = {
  cancelado: 'Cancelaste el inicio de sesión.',
  estado: 'El intento de acceso expiró. Vuelve a intentarlo.',
  dominio: `Esa cuenta no pertenece a @${GOOGLE_WORKSPACE_DOMAIN}. Entra con tu correo de Gerundio.`,
  google: 'Google no pudo confirmar tu identidad. Vuelve a intentarlo.',
}

export const Route = createFileRoute('/login')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { error?: string; redirect?: string } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { error, redirect } = Route.useSearch()

  // <a> y no <Link>: el login es una navegación real del navegador al servidor, no una
  // transición del router.
  const loginHref = redirect
    ? `/api/auth/login?redirect=${encodeURIComponent(redirect)}`
    : '/api/auth/login'

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-6">
      <div className="card w-full max-w-sm px-8 py-10 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
          <GrndIcon name="ideas" size={28} />
        </div>

        <h1 className="text-xl font-bold text-ink-900">Gerundio · Salas</h1>
        <p className="mt-2 text-sm text-ink-500">
          Reserva de salas de junta. Entra con tu cuenta{' '}
          <span className="font-semibold text-ink-700">@{GOOGLE_WORKSPACE_DOMAIN}</span>.
        </p>

        {error && (
          <p className="alert-error mt-6 text-left">
            {ERROR_MESSAGES[error] ?? 'No se pudo iniciar sesión.'}
          </p>
        )}

        <a href={loginHref} className="btn-primary mt-8 w-full justify-center">
          <GrndIcon name="conectando" size={18} /> Continuar con Google
        </a>
      </div>
    </main>
  )
}
