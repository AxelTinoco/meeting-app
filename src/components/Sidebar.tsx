import { LogOut } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar } from './Avatar'
import { GrndIcon } from './GrndIcon'
import { springSnappy } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'
import type { SessionUser } from '../lib/types'

interface NavItem {
  icon: GrndIconName
  label: string
  active?: boolean
}

const NAV: NavItem[] = [
  { icon: 'mapeando', label: 'Mapa', active: true },
  { icon: 'midiendo', label: 'Timeline' },
  { icon: 'jerarquizando', label: 'Directorio' },
  { icon: 'disenando', label: 'Ajustes' },
  { icon: 'entendiendo', label: 'Soporte' },
]

/**
 * `full` es el sidebar de escritorio y el contenido del drawer en móvil;
 * `icons` es el riel estrecho de tablet, donde 240px de ancho le quitarían
 * al mapa el espacio que necesita para leerse.
 */
export type SidebarVariant = 'full' | 'icons'

interface SidebarProps {
  user: SessionUser
  variant?: SidebarVariant
  /**
   * Sufijo del `layoutId` de la píldora activa. Los dos sidebars de escritorio
   * (riel e completo) están montados a la vez y solo se alternan por CSS: sin
   * sufijo motion los trataría como el mismo elemento compartido e intentaría
   * animar la píldora entre dos árboles, uno de ellos oculto.
   */
  scope: string
  /** Clases de visibilidad por breakpoint; el layout las decide desde fuera. */
  className?: string
  /** En el drawer, tocar una sección lo cierra. */
  onNavigate?: () => void
}

export function Sidebar({
  user,
  variant = 'full',
  scope,
  className = '',
  onNavigate,
}: SidebarProps) {
  const icons = variant === 'icons'

  return (
    <aside
      className={`flex shrink-0 flex-col border-ink-200 bg-ink-50/60 ${
        icons ? 'w-18 items-center px-2 py-4' : 'w-60 px-3 py-5'
      } ${className}`}
    >
      <div
        className={`mb-8 flex items-center ${icons ? 'justify-center' : 'gap-3 px-2'}`}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
          <GrndIcon name="ideas" size={20} />
        </div>
        {!icons && (
          <div className="leading-tight">
            <p className="text-base font-bold text-brand-500">Gerundio</p>
            <p className="text-xs text-ink-500">Salas</p>
          </div>
        )}
      </div>

      <nav className="relative flex w-full flex-col gap-1">
        {NAV.map((item) => (
          <motion.button
            key={item.label}
            type="button"
            onClick={onNavigate}
            aria-current={item.active ? 'page' : undefined}
            // En el riel de iconos no hay etiqueta visible, así que el nombre
            // de la sección tiene que llegar por otro lado.
            aria-label={icons ? item.label : undefined}
            title={icons ? item.label : undefined}
            // El desplazamiento lateral no cabe en el riel: ahí el hover crece
            // en el sitio en vez de empujar el icono contra el borde.
            whileHover={icons ? { scale: 1.06 } : { x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            className={`relative flex items-center rounded-xl text-sm ${
              icons ? 'size-11 justify-center self-center' : 'gap-3 px-3 py-2.5'
            } ${
              item.active
                ? 'font-semibold text-white'
                : 'font-medium text-ink-600 transition-colors hover:bg-ink-200/60'
            }`}
          >
            {/* La píldora activa es un elemento compartido: cuando estas
                secciones se conecten al router, `layoutId` la hará deslizarse
                de una entrada a otra en vez de reaparecer. Va antes que el
                contenido y este lleva `relative`: así el orden de pintado la
                deja detrás sin recurrir a un z-index negativo, que se colaría
                bajo el fondo del sidebar. */}
            {item.active && (
              <motion.span
                layoutId={`nav-active-${scope}`}
                transition={springSnappy}
                className="absolute inset-0 rounded-xl bg-brand-500 shadow-sm"
              />
            )}
            <GrndIcon name={item.icon} size={18} className="relative" />
            {!icons && <span className="relative">{item.label}</span>}
          </motion.button>
        ))}
      </nav>

      <div
        className={`mt-auto flex items-center rounded-xl ${
          icons ? 'flex-col gap-2 py-2' : 'gap-3 px-2 py-2 hover:bg-ink-200/60'
        }`}
      >
        <Avatar
          email={user.email}
          name={user.name}
          picture={user.picture}
          size={36}
          // Sin el nombre al lado la cara tiene que decir de quién es.
          alt={icons ? user.name : undefined}
        />
        {!icons && (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-ink-800">
              {user.name}
            </p>
            <p className="truncate text-xs text-ink-400">{user.email}</p>
          </div>
        )}
        {/* Form y no fetch: el logout es POST (un GET lo dispararía cualquier página). */}
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-700"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  )
}
