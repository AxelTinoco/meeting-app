import { useEffect, useId, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import {
  AgendaClock,
  AgendaHeading,
  AgendaList,
  highlightItem,
} from './UpcomingRail'
import { mxTimeLabel } from '../lib/mexico-time'
import { overlayVariants, springSurface } from '../lib/motion'
import type { UpcomingItem } from '../lib/dashboard'

interface AgendaSheetProps {
  items: UpcomingItem[]
  /** Ver `UpcomingRail`: `null` hasta que el reloj del cliente arranca. */
  now: Date | null
}

/** Desplazamiento (px) o velocidad (px/s) a partir de los cuales el gesto cuenta. */
const DRAG_DISTANCE = 44
const DRAG_VELOCITY = 380

/**
 * La agenda en móvil y tablet, colgada del borde inferior.
 *
 * Cerrada asoma lo justo —hora y la reunión que manda ahora mismo—, que es lo
 * que se consulta de pasada; abierta cubre la pantalla hasta poder leer el día
 * entero. En los dos casos el plano (o la lista) sigue siendo el protagonista,
 * a diferencia de lo que pasaría con una pestaña a pantalla completa.
 *
 * El arrastre no mueve la hoja punto por punto: tira contra un tope elástico y
 * al soltar salta al estado que pida el gesto. Animar la altura en cada frame
 * del dedo obliga a recalcular el layout de toda la lista; así el gesto
 * responde igual y el trabajo de verdad ocurre una sola vez, al soltar.
 */
export function AgendaSheet({ items, now }: AgendaSheetProps) {
  const [open, setOpen] = useState(false)
  const dragControls = useDragControls()
  const bodyId = useId()
  const highlight = highlightItem(items)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      {/* Atenúa lo que hay detrás cuando la hoja ocupa casi toda la pantalla, y
          da dónde tocar para cerrarla sin tener que arrastrar. */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
            onClick={() => setOpen(false)}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        aria-label="Agenda de hoy"
        drag="y"
        dragControls={dragControls}
        // El arrastre solo arranca desde el asa: si escuchara en toda la hoja,
        // competiría con el scroll de la lista de reuniones.
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.16}
        onDragEnd={(_, { offset, velocity }) => {
          if (offset.y < -DRAG_DISTANCE || velocity.y < -DRAG_VELOCITY) {
            setOpen(true)
          } else if (offset.y > DRAG_DISTANCE || velocity.y > DRAG_VELOCITY) {
            setOpen(false)
          }
        }}
        // `md:left-18` es el ancho del riel de iconos: a pantalla completa la
        // hoja le taparía el pie, que es donde viven el avatar y cerrar sesión.
        className="fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-2xl border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-12px_40px_-16px_rgba(11,12,20,0.35)] md:left-18 lg:hidden"
      >
        {/* `touch-none`: sin esto el navegador se queda el gesto vertical para
            hacer scroll y el arrastre nunca llega a motion. */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="relative flex shrink-0 touch-none flex-col px-4 pb-3 pt-2"
        >
          <span className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink-300" />

          <div className="flex items-center gap-3">
            <AgendaClock now={now} compact />

            <div className="min-w-0 flex-1">
              {highlight ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">
                    {highlight.status === 'active' ? 'En curso' : 'Próxima'} ·{' '}
                    {mxTimeLabel(highlight.start)}
                  </p>
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {highlight.title}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-500">
                  Sin reuniones pendientes hoy.
                </p>
              )}
            </div>

            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={springSurface}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400"
            >
              <ChevronUp size={20} />
            </motion.span>
          </div>

          {/* El asa entera es el control. Va como capa encima y no envolviendo
              la fila porque un <button> solo admite contenido en línea, y aquí
              dentro hay bloques (el reloj, el resumen a dos renglones). */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? 'Contraer agenda' : 'Desplegar agenda'}
            className="absolute inset-0 rounded-t-2xl"
          />
        </div>

        {/* `initial={false}`: en la primera pintada la hoja ya está cerrada, no
            se está cerrando. */}
        <motion.div
          id={bodyId}
          initial={false}
          animate={{ height: open ? 'auto' : 0 }}
          transition={springSurface}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4">
            <AgendaHeading className="mb-3 mt-0" />
            <AgendaList items={items} className="max-h-[52dvh] pb-1" />
          </div>
        </motion.div>
      </motion.aside>
    </>
  )
}
