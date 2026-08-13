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

export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-ink-200 bg-ink-50/60 px-3 py-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
          <GrndIcon name="ideas" size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-brand-500">Gerundio</p>
          <p className="text-xs text-ink-500">Salas</p>
        </div>
      </div>

      <nav className="relative flex flex-col gap-1">
        {NAV.map((item) => (
          <motion.button
            key={item.label}
            type="button"
            aria-current={item.active ? 'page' : undefined}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={springSnappy}
            className={
              item.active
                ? 'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white'
                : 'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-200/60'
            }
          >
            {/* La píldora activa es un elemento compartido: cuando estas
                secciones se conecten al router, `layoutId` la hará deslizarse
                de una entrada a otra en vez de reaparecer. Va antes que el
                contenido y este lleva `relative`: así el orden de pintado la
                deja detrás sin recurrir a un z-index negativo, que se colaría
                bajo el fondo del sidebar. */}
            {item.active && (
              <motion.span
                layoutId="nav-active"
                transition={springSnappy}
                className="absolute inset-0 rounded-xl bg-brand-500 shadow-sm"
              />
            )}
            <GrndIcon name={item.icon} size={18} className="relative" />
            <span className="relative">{item.label}</span>
          </motion.button>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-ink-200/60">
        <Avatar
          email={user.email}
          name={user.name}
          picture={user.picture}
          size={36}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-ink-800">
            {user.name}
          </p>
          <p className="truncate text-xs text-ink-500">{user.email}</p>
        </div>
        {/* Form y no fetch: el logout es POST (un GET lo dispararía cualquier página). */}
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex size-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-700"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  )
}
