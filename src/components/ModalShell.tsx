import { createContext, useContext, useEffect, useId, useRef } from 'react'
import { motion } from 'motion/react'
import { overlayVariants, panelVariants } from '../lib/motion'

/** Selector de lo que puede recibir foco dentro del panel. */
const ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Id del título, puesto por `ModalShell` y consumido por `ModalTitle`.
 *
 * Va por contexto y no por prop para que el texto del título siga viviendo en un
 * solo sitio: si el modal tuviera que repetirlo en un `aria-label`, tarde o
 * temprano el rótulo visible y el anunciado se separarían.
 */
const TituloIdContext = createContext<string | undefined>(undefined)

/**
 * Título del modal. Es el `<h2>` de siempre, más el id al que apunta el
 * `aria-labelledby` del diálogo: es lo que hace que al abrirse se anuncie
 * "Reservar sala, diálogo" en vez de solo "diálogo".
 */
export function ModalTitle({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h2 id={useContext(TituloIdContext)} className={className}>
      {children}
    </h2>
  )
}

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
 *
 * Aquí vive también todo el comportamiento de accesibilidad de los cuatro
 * modales de la app (ver A-01 en `docs/accesibilidad.md`): rol y nombre, cierre
 * con Escape, foco que entra al abrir, no se escapa mientras está abierto y
 * vuelve a su sitio al cerrar. Se resuelve una vez aquí porque un modal que se
 * olvide de la mitad no se ve roto — simplemente deja fuera a quien no usa ratón.
 */
export function ModalShell({
  onClose,
  panelClassName = '',
  overlayClassName = '',
  children,
}: ModalShellProps) {
  const tituloId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null

    // Se enfoca el panel, no su primer control: así el lector de pantalla
    // anuncia el título del diálogo antes que "botón cerrar", y el primer Tab
    // sigue llevando al primer campo.
    panelRef.current?.focus()

    // Devolver el foco a quien abrió el modal es lo que evita que, al cerrar,
    // el usuario de teclado aparezca al principio de la página.
    return () => previo?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      // Con modales apilados (el detalle de sala abre reserva encima) el foco
      // está en el panel de arriba, y su overlay no es ancestro del de abajo:
      // el evento no llega al de atrás. `stopPropagation` cubre el caso de que
      // alguna vez sí se aniden en el DOM.
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const enfocables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(ENFOCABLE) ?? [],
    )
    if (!enfocables.length) return

    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    // El ciclo es lo que impide tabular al tablero de atrás, que sigue vivo.
    if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primero.focus()
    }
  }

  return (
    // El overlay no es un control: el clic para cerrar es un atajo de ratón y su
    // equivalente de teclado es Escape, que se atiende en `handleKeyDown`.
    <motion.div
      className={`modal-overlay ${overlayClassName}`}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <TituloIdContext.Provider value={tituloId}>
        {/* Hereda hidden/visible del overlay por contexto: no repite initial/animate. */}
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          // -1: enfocable por código al abrir, pero fuera del orden de tabulación.
          tabIndex={-1}
          className={`modal-panel ${panelClassName}`}
          onClick={(e) => e.stopPropagation()}
          variants={panelVariants}
        >
          {children}
        </motion.div>
      </TituloIdContext.Provider>
    </motion.div>
  )
}
