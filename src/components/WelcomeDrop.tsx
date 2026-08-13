import { useEffect, useState } from 'react'

/* Entrada de sesión: una gota cae al centro y el impacto abre el tablero.
   Solo se ve al volver del login (ver `?bienvenida=1` en index.tsx).

   Todo el movimiento vive en CSS (`styles.css`, sección "la gota"), no en motion:
   el velo tiene que estar pintado en el primer frame del HTML del servidor. Si
   esperara a la hidratación, el tablero ya se habría visto entero antes de que
   cayera la gota y la animación no cubriría nada, solo estorbaría.

   Este componente aporta la única parte que sí necesita JS: quitarse de en medio
   cuando termina. Y es un extra, no un requisito — los keyframes acaban en
   `opacity: 0` y `pointer-events: none`, así que un bundle que nunca llegue deja
   la app igual de visible y usable. */

/** Lo que dura la animación completa (ver `gota-abre`) más un margen. */
const DURACION_MS = 1150

export function WelcomeDrop() {
  const [terminada, setTerminada] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTerminada(true), DURACION_MS)
    return () => clearTimeout(id)
  }, [])

  if (terminada) return null

  return (
    <div className="welcome-stage" aria-hidden="true">
      {/* El velo hereda el degradado del login: la pantalla llega todavía azul
          y se abre desde el punto del impacto. */}
      <div className="welcome-veil" />

      {/* Origen del impacto. Centra a sus hijos; ellos solo animan lo suyo. */}
      <div className="welcome-point">
        <span className="welcome-drop" />
        <span className="welcome-ring" />
        <span className="welcome-ring-late" />
      </div>
    </div>
  )
}
