import { motion } from 'motion/react'
import { overlayVariants, panelVariants } from '../lib/motion'

interface ModalShellProps {
  onClose: () => void
  /** Clases del panel: ancho, padding y layout los decide cada modal. */
  panelClassName?: string
  /** Clases del overlay; en la práctica solo el z-index de la capa. */
  overlayClassName?: string
  children: React.ReactNode
}

/**
 * Capa animada compartida por todos los modales: overlay + panel, cierre por
 * click fuera y las variantes de entrada/salida.
 *
 * La salida solo ocurre si quien lo monta lo envuelve en `<AnimatePresence>`;
 * sin eso React desmonta el árbol antes de que la animación pueda correr.
 */
export function ModalShell({
  onClose,
  panelClassName = '',
  overlayClassName = '',
  children,
}: ModalShellProps) {
  return (
    <motion.div
      className={`modal-overlay ${overlayClassName}`}
      onClick={onClose}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      {/* Hereda hidden/visible del overlay por contexto: no repite initial/animate. */}
      <motion.div
        className={`modal-panel ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        variants={panelVariants}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
