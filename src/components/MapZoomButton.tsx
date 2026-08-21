import { motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { springSnappy } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'

interface MapZoomButtonProps {
  icon: GrndIconName
  label: string
  onClick?: () => void
}

/** Botón de la torre de controles del mapa. Lo comparten el plano y la vista 3D. */
export function MapZoomButton({ icon, label, onClick }: MapZoomButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={springSnappy}
      className="flex size-11 items-center justify-center text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-600"
    >
      <GrndIcon name={icon} size={18} />
    </motion.button>
  )
}
