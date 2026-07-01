import {
  Building2,
  ChevronsUpDown,
  HelpCircle,
  LayoutGrid,
  Map as MapIcon,
  Settings,
  TrendingUp,
} from 'lucide-react'
import type { SessionUser } from '../lib/auth'

interface NavItem {
  icon: typeof MapIcon
  label: string
  active?: boolean
}

const NAV: NavItem[] = [
  { icon: MapIcon, label: 'Mapa', active: true },
  { icon: TrendingUp, label: 'Timeline' },
  { icon: LayoutGrid, label: 'Directorio' },
  { icon: Settings, label: 'Ajustes' },
  { icon: HelpCircle, label: 'Soporte' },
]

export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 px-3 py-5">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm">
          <Building2 size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-violet-600">Gerundio</p>
          <p className="text-xs text-slate-500">Salas</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-current={item.active ? 'page' : undefined}
            className={
              item.active
                ? 'flex items-center gap-3 rounded-xl bg-violet-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm'
                : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/60'
            }
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-200/60">
        <div className="flex size-9 items-center justify-center rounded-full bg-slate-300 text-sm font-semibold text-slate-600">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <ChevronsUpDown size={16} className="text-slate-400" />
      </div>
    </aside>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
