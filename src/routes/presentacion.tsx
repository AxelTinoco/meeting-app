import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createFileRoute } from '@tanstack/react-router'
import { GrndIcon } from '../components/GrndIcon'
import { Isotipo } from '../components/Isotipo'
import { LiquidBackground } from '../components/LiquidBackground'
import type { GrndIconName } from '../components/GrndIcon'

/**
 * Presentación del proyecto: qué es, qué resuelve y hacia dónde va.
 *
 * Ruta PÚBLICA y provisional (ver `isPublicPath` en `__root.tsx`): se enseña en
 * una junta desde el proyector, sin pedirle a nadie que inicie sesión. No lee
 * datos reales — todo el contenido vive aquí abajo — así que exponerla no
 * expone nada de la app.
 */

/** Video de cierre. Cuando exista el archivo, se coloca en `public/presentacion/`. */
const VIDEO_SRC = '/presentacion/demo.mp4'

interface Slide {
  /** Rótulo corto de la sección; sale arriba a la izquierda. */
  kicker: string
  title: string
  /** Frase de apoyo bajo el título. Opcional: la portada y el video no la usan. */
  lead?: string
  points?: Array<{ icon: GrndIconName; title: string; body: string }>
  /** Marca las dos diapositivas que no son una lista de puntos. */
  kind?: 'portada' | 'video'
}

const SLIDES: Array<Slide> = [
  {
    kind: 'portada',
    kicker: 'Gerundio',
    title: 'Salas',
    lead: 'Visibilidad del uso de nuestras salas para organizar la semana y aprovechar mejor el espacio de trabajo.',
  },
  {
    kicker: 'El problema',
    title: 'No sabemos cómo estamos usando nuestro espacio',
    lead: 'El problema de fondo no es reservar: es que ni el equipo ni la operación tienen una vista de cómo se ocupan las salas.',
    points: [
      {
        icon: 'viendo',
        title: 'Sin visibilidad del uso',
        body: 'No existe una vista de la ocupación real, ni del día ni de la semana. Se decide por percepción, no por lo que efectivamente pasa.',
      },
      {
        icon: 'colaborando',
        title: 'La coordinación recae en las personas',
        body: 'Encontrar espacio para una junta implica preguntar, negociar y reacomodar agendas por chat. Ese costo lo paga el equipo todos los días.',
      },
      {
        icon: 'jerarquizando',
        title: 'La semana se organiza sobre la marcha',
        body: 'Sin panorama semanal, las juntas se concentran en las mismas franjas y las salas grandes terminan ocupadas por dos personas.',
      },
      {
        icon: 'midiendo',
        title: 'Sin datos no hay decisiones',
        body: 'No podemos sustentar si falta una sala, si sobra capacidad o si conviene reconfigurar el espacio.',
      },
    ],
  },
  {
    kicker: 'La solución',
    title: 'Visibilidad para decidir, no solo para reservar',
    lead: 'Una sola pantalla donde el equipo se organiza solo y la operación ve cómo se está usando el espacio.',
    points: [
      {
        icon: 'mapeando',
        title: 'El plano de HQ en vivo',
        body: 'El estado real de cada sala en el momento: libre, reservada o en curso. El equipo se ubica sin preguntarle a nadie.',
      },
      {
        icon: 'analizando',
        title: 'Panorama del día y de la semana',
        body: 'Se ve dónde están los espacios disponibles y se elige el horario que menos interfiere con el resto de la operación.',
      },
      {
        icon: 'agilizando',
        title: 'Reserva en dos pasos',
        body: 'Sala, horario y asistentes. La invitación sale de Google Calendar como siempre, con la sala y las indicaciones incluidas.',
      },
      {
        icon: 'midiendo',
        title: 'Base para decisiones de espacio',
        body: 'Cada reserva deja registro: ocupación por sala, por día y por franja horaria, disponible para planear la semana.',
      },
    ],
  },
  {
    kicker: 'Cómo está hecho',
    title: 'Sobre la infraestructura que ya usamos',
    lead: 'Ninguna pieza nueva que administrar: sin base de datos, sin servidores y sin un segundo directorio de usuarios.',
    points: [
      {
        icon: 'conexion',
        title: 'Google Calendar como fuente de verdad',
        body: 'Disponibilidad, conflictos e invitaciones se resuelven contra los recursos de calendario de Workspace.',
      },
      {
        icon: 'enfocando',
        title: 'Acceso restringido al dominio',
        body: 'Inicio de sesión con Google limitado a gerundio.com.mx, con roles de administrador y de miembro.',
      },
      {
        icon: 'avanzando',
        title: 'Cloudflare Workers',
        body: 'La aplicación corre en el borde: sin infraestructura que mantener y con un despliegue de un solo comando.',
      },
      {
        icon: 'disenando',
        title: 'Design system de Gerundio',
        body: 'Color, iconografía y movimiento salen del manual de marca, no de una plantilla genérica.',
      },
    ],
  },
  {
    kicker: 'Estado actual',
    title: 'Lo que ya está operando',
    lead: 'La aplicación cubre el recorrido completo: entrar, ver disponibilidad, reservar, editar y cancelar.',
    points: [
      {
        icon: 'viendo',
        title: 'Tablero y plano por piso',
        body: 'Mapa de las salas en 2D y 3D, próximas reservas del día y detalle de cada espacio.',
      },
      {
        icon: 'iterando',
        title: 'Gestión de reservas con roles',
        body: 'Cada persona administra las suyas; un administrador puede intervenir cualquier reserva.',
      },
      {
        icon: 'sonando',
        title: 'Notificaciones en Slack',
        body: 'El canal recibe aviso al reservar y al cancelar, con la sala, el horario y el responsable.',
      },
      {
        icon: 'compartiendo',
        title: 'Indicaciones para invitados externos',
        body: 'Cada sala incluye su ubicación y cómo llegar desde recepción dentro de la invitación.',
      },
    ],
  },
  {
    kicker: 'Próximos pasos',
    title: 'De la reserva a la planeación',
    lead: 'La prioridad es cerrar el objetivo original: organizar la semana con datos de uso.',
    points: [
      {
        icon: 'seleccionando',
        title: 'Vista semanal por sala',
        body: 'La semana completa de un vistazo, para distribuir las juntas en lugar de concentrarlas en las mismas horas.',
      },
      {
        icon: 'midiendo',
        title: 'Tablero de ocupación',
        body: 'Uso por sala, día y franja horaria: el insumo para decidir con datos si el espacio alcanza o hay que reacomodarlo.',
      },
      {
        icon: 'target',
        title: 'Recuperar salas sin uso',
        body: 'Confirmación rápida de asistencia: la reserva que nadie confirma se libera y la sala vuelve al mapa.',
      },
      {
        icon: 'expandiendo',
        title: 'Salas desde Workspace',
        body: 'Leer las salas del directorio de Google: dar de alta un espacio deja de requerir un cambio en el código.',
      },
    ],
  },
  {
    kind: 'video',
    kicker: 'Demo',
    title: 'Así se ve',
    lead: 'Recorrido de la aplicación: iniciar sesión, revisar disponibilidad y reservar.',
  },
]

export const Route = createFileRoute('/presentacion')({
  component: PresentacionPage,
})

function PresentacionPage() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const last = SLIDES.length - 1

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => Math.min(last, Math.max(0, current + delta)))
    },
    [last],
  )

  // Se navega con el teclado porque así se presenta: con el clicker o las
  // flechas, sin buscar un botón con el cursor delante de todos.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') go(1)
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(-1)
      else if (event.key === ' ') {
        event.preventDefault()
        go(1)
      } else if (event.key === 'Home') setIndex(0)
      else if (event.key === 'End') setIndex(last)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, last])

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden bg-brand-950 text-white">
      <LiquidBackground variant="liquido" speed={0.5} />

      {/* Velo negro entre el fondo y el contenido. El azul de marca a plena
          luminosidad le come contraste al texto blanco, y bajarle el brillo al
          shader lo tocaría para toda la app: el velo vive solo aquí. Va sin
          `z-index` a propósito — el canvas tampoco lo tiene, así que el orden
          del DOM lo deja encima del fondo y debajo del contenido (`z-10`). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/55"
      />

      {/* Barra de avance: la única pista de cuánto falta. */}
      <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-white/10">
        <div
          className="h-full bg-aqua-300 transition-[width] duration-300"
          style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-8 py-6 sm:px-14">
        <div className="flex items-center gap-3">
          <Isotipo size={32} />
          <span className="text-sm font-semibold tracking-wide text-white/70">
            Gerundio · Salas
          </span>
        </div>
        <span className="text-xs font-medium tabular-nums text-white/40">
          {index + 1} / {SLIDES.length}
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 items-center px-8 pb-4 sm:px-14">
        <AnimatePresence mode="wait">
          <motion.section
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-5xl"
          >
            {slide.kind === 'portada' ? (
              <Portada slide={slide} />
            ) : slide.kind === 'video' ? (
              <Video slide={slide} />
            ) : (
              <Contenido slide={slide} />
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="relative z-10 flex items-center justify-between gap-4 px-8 py-6 sm:px-14">
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ir a "${s.title}"`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? 'w-7 bg-aqua-300'
                  : 'w-1.5 bg-white/25 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="btn border border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
          >
            <GrndIcon name="retrocediendo" size={16} /> Anterior
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === last}
            className="btn bg-white text-brand-950 hover:bg-white/90 disabled:opacity-30"
          >
            Siguiente <GrndIcon name="avanzando" size={16} />
          </button>
        </div>
      </footer>
    </main>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-aqua-300">
      {children}
    </p>
  )
}

function Portada({ slide }: { slide: Slide }) {
  return (
    <div className="text-center">
      <Isotipo size={72} className="mx-auto mb-8 block" />
      <p className="text-lg font-medium text-white/60">{slide.kicker}</p>
      <h1 className="mt-1 text-6xl font-bold tracking-tight sm:text-8xl">
        {slide.title}
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
        {slide.lead}
      </p>
      <p className="mt-10 text-xs text-white/35">
        Usa las flechas del teclado para avanzar.
      </p>
    </div>
  )
}

function Contenido({ slide }: { slide: Slide }) {
  return (
    <div>
      <Kicker>{slide.kicker}</Kicker>
      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {slide.title}
      </h2>
      {slide.lead && (
        <p className="mt-4 max-w-2xl text-lg text-white/70">{slide.lead}</p>
      )}

      <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {slide.points?.map((point) => (
          <div key={point.title} className="flex gap-4">
            <span className="mt-0.5 flex size-10 flex-none items-center justify-center rounded-lg bg-white/10 text-aqua-300">
              <GrndIcon name={point.icon} size={22} />
            </span>
            <div>
              <h3 className="font-semibold">{point.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                {point.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Video({ slide }: { slide: Slide }) {
  // El archivo puede no estar todavía; si el navegador no lo carga se enseña el
  // hueco con la ruta esperada en vez de un reproductor roto en plena junta.
  const [falla, setFalla] = useState(false)

  return (
    <div>
      <Kicker>{slide.kicker}</Kicker>
      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {slide.title}
      </h2>
      {slide.lead && (
        <p className="mt-3 max-w-2xl text-lg text-white/70">{slide.lead}</p>
      )}

      <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl border border-white/15 bg-black/40">
        {falla ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <GrndIcon name="cargando" size={32} className="text-white/40" />
            <p className="text-sm text-white/60">
              Falta el video. Colócalo en{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">
                public{VIDEO_SRC}
              </code>
            </p>
          </div>
        ) : (
          <video
            src={VIDEO_SRC}
            controls
            playsInline
            preload="metadata"
            onError={() => setFalla(true)}
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  )
}
