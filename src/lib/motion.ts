import type { Transition, Variants } from 'motion/react'

/* ==========================================================================
   Lenguaje de movimiento Gerundio

   Igual que los colores viven en un solo sitio (styles.css), las curvas y los
   tiempos viven aquí: los componentes hablan de intenciones ("superficie que
   entra", "elemento de lista"), no de números sueltos.

   Reglas:
     · Entrar es más lento que salir. Al abrir hay que orientar; al cerrar el
       usuario ya decidió y cualquier demora se siente lenta.
     · Nada dura más de ~300 ms. La app es un tablero operativo, no una landing.
     · Solo se animan `opacity` y `transform` (x/y/scale): son las propiedades
       que el compositor resuelve sin recalcular layout.

   El respeto a `prefers-reduced-motion` no se maneja componente por componente:
   `<MotionConfig reducedMotion="user">` en __root.tsx lo aplica a toda la app.
   ========================================================================== */

/** Entrada de superficies (modales, tarjetas): resorte corto, sin rebote visible. */
export const springSurface: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.9,
}

/** Micro-interacciones (hover, tap): más rígido, la respuesta debe sentirse inmediata. */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 600,
  damping: 30,
  mass: 0.6,
}

const enter: Transition = { duration: 0.2, ease: 'easeOut' }
const exit: Transition = { duration: 0.14, ease: 'easeIn' }

/* --- Modales --------------------------------------------------------------
   El overlay solo hace fade; el panel además escala y sube. Ambos comparten los
   nombres de estado (`hidden`/`visible`) para que el panel herede el estado del
   overlay por contexto y no haya que repetir initial/animate/exit en el hijo.
   -------------------------------------------------------------------------- */
export const overlayVariants: Variants = {
  hidden: { opacity: 0, transition: exit },
  visible: { opacity: 1, transition: enter },
}

export const panelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8, transition: exit },
  visible: { opacity: 1, scale: 1, y: 0, transition: springSurface },
}

/* --- Listas y colecciones -------------------------------------------------
   El contenedor no anima nada propio: solo orquesta el escalonado de sus hijos.
   -------------------------------------------------------------------------- */
export function staggerContainer(stagger = 0.04, delay = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
  }
}

/* La entrada de las salas del mapa NO vive aquí: está en `tile-enter` (styles.css).
   Motion emite su estado `initial` en el HTML del servidor, así que animar ahí la
   primera pintada dejaba el plano en blanco hasta que hidrataba el bundle. Es la
   única excepción a "el movimiento vive en motion", y es deliberada. */

/* --- Reloj ----------------------------------------------------------------
   Cada dígito es su propia presencia: al cambiar el minuto solo rueda el dígito
   que cambió, no el reloj entero. El nuevo cae desde arriba y el viejo se va por
   abajo, así que el movimiento se lee como una rueda que gira, no como un fade.

   Los desplazamientos van en % (relativos a la altura del propio dígito) para
   que el recorrido siga siendo exactamente una vuelta si cambia el tamaño de
   letra, y para que el `overflow-hidden` del carril los recorte a tiempo.
   -------------------------------------------------------------------------- */
export const clockDigitVariants: Variants = {
  hidden: { y: '-110%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 },
  },
  exit: { y: '110%', opacity: 0, transition: exit },
}

/**
 * Tarjeta de la agenda: entra desde la derecha, el borde del que cuelga el riel.
 *
 * `custom={true}` la deja atenuada (reunión ya terminada). La opacidad final
 * tiene que salir de la variante y no de una clase: motion escribe `opacity` en
 * el estilo inline y ahí gana siempre al `opacity-60` de Tailwind.
 */
export const railItemVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: (dimmed = false) => ({
    opacity: dimmed ? 0.6 : 1,
    x: 0,
    transition: springSurface,
  }),
  exit: { opacity: 0, x: 16, transition: exit },
}
