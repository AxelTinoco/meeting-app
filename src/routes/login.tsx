import { createFileRoute } from '@tanstack/react-router'
import { GrndIcon } from '../components/GrndIcon'
import { LiquidBackground } from '../components/LiquidBackground'
import { GOOGLE_WORKSPACE_DOMAIN } from '../lib/constants'
import type { LiquidVariant } from '../components/LiquidBackground'

/** Motivos que manda el callback en `?error=`. */
const ERROR_MESSAGES: Record<string, string> = {
  cancelado: 'Cancelaste el inicio de sesión.',
  estado: 'El intento de acceso expiró. Vuelve a intentarlo.',
  dominio: `Esa cuenta no pertenece a @${GOOGLE_WORKSPACE_DOMAIN}. Entra con tu correo de Gerundio.`,
  google: 'Google no pudo confirmar tu identidad. Vuelve a intentarlo.',
}

/** Fondo por defecto. `?fondo=humo` en la URL sirve para comparar la otra
    variante en vivo; cuando se decida cuál queda, se fija aquí. */
const FONDO: LiquidVariant = 'liquido'

export const Route = createFileRoute('/login')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { error?: string; redirect?: string; fondo?: LiquidVariant } => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    fondo:
      search.fondo === 'humo' || search.fondo === 'liquido'
        ? search.fondo
        : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { error, redirect, fondo } = Route.useSearch()
  const variant = fondo ?? FONDO

  // <a> y no <Link>: el login es una navegación real del navegador al servidor, no una
  // transición del router.
  const loginHref = redirect
    ? `/api/auth/login?redirect=${encodeURIComponent(redirect)}`
    : '/api/auth/login'

  return (
    // `bg-brand-950` debajo del canvas: es el color al que muere el degradado, así
    // que ni el primer frame ni un WebGL caído enseñan blanco.
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-950 px-6">
      <LiquidBackground
        variant={variant}
        speed={variant === 'humo' ? 1 : 0.85}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 px-8 py-10 text-center shadow-[0_28px_80px_-24px_rgba(2,0,42,0.85)] backdrop-blur-md">
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
