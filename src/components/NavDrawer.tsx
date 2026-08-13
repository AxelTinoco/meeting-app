import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Sidebar } from './Sidebar'
import { overlayVariants, springSurface } from '../lib/motion'
import type { SessionUser } from '../lib/types'

interface NavDrawerProps {
  open: boolean
  onClose: () => void
  user: SessionUser
}

/**
 * Navegación de móvil: el mismo `Sidebar` de escritorio, servido como panel
 * lateral. No duplica el menú porque no debe poder desincronizarse del de
 * escritorio — solo cambia dónde se pinta.
 */
export function NavDrawer({ open, onClose, user }: NavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape cierra, y al abrir el foco entra al panel: si se quedara en el botón
  // hamburguesa, el tabulador seguiría recorriendo la app que hay detrás.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="md:hidden">
          <motion.div
            className="fixed inset-0 z-50 bg-ink-950/50"
            onClick={onClose}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navegación"
            tabIndex={-1}
            // Entra deslizando desde el borde del que sale, no con un fundido:
            // el panel tiene que leerse como algo que estaba fuera de pantalla.
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={springSurface}
            className="fixed inset-y-0 left-0 z-50 flex max-w-[82vw] outline-none"
          >
            <Sidebar
              user={user}
              variant="full"
              scope="drawer"
              className="h-full border-r"
              onNavigate={onClose}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar navegación"
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-200 hover:text-ink-700"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
