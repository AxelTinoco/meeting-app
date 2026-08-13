import { Menu } from 'lucide-react'
import { Avatar } from './Avatar'
import { GrndIcon } from './GrndIcon'
import type { SessionUser } from '../lib/types'

interface AppHeaderProps {
  user: SessionUser
  onOpenNav: () => void
}

/**
 * Barra superior de móvil. Solo existe por debajo de `md`: a partir de ahí el
 * riel de iconos ya lleva la marca, la navegación y el usuario.
 *
 * `shrink-0` porque cuelga de un contenedor `flex-col` de altura fija (el
 * shell): sin él, la lista de salas lo comprimiría al crecer.
 */
export function AppHeader({ user, onOpenNav }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-3 py-2 md:hidden">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Abrir navegación"
        className="flex size-11 items-center justify-center rounded-xl text-ink-600 transition-colors hover:bg-ink-100"
      >
        <Menu size={22} />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <GrndIcon name="ideas" size={16} />
        </div>
        <p className="truncate text-sm font-bold text-brand-500">
          Gerundio <span className="font-medium text-ink-400">· Salas</span>
        </p>
      </div>

      {/* El avatar abre el mismo panel: ahí viven los datos de la cuenta y el
          botón de cerrar sesión, que no caben en la barra. */}
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Abrir navegación y cuenta"
        className="ml-auto flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-ink-100"
      >
        <Avatar
          email={user.email}
          name={user.name}
          picture={user.picture}
          size={30}
        />
      </button>
    </header>
  )
}
