import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, Html, OrbitControls, useCursor } from '@react-three/drei'
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Vector3,
} from 'three'
import { MapZoomButton } from './MapZoomButton'
import { GrndIcon } from './GrndIcon'
import { ROOM_STATUS_STYLES, ROOM_STATUS_VARS, deriveRoomView } from '../lib/dashboard'
import { groupRoomsByFloor } from '../lib/floors'
import { fixturesForFloor } from '../lib/floorplan'
import { mxTimeLabel } from '../lib/mexico-time'
import type { ComponentRef } from 'react'
import type { RoomView } from '../lib/dashboard'
import type { FloorGroup } from '../lib/floors'
import type { Fixture, FixtureKind } from '../lib/floorplan'
import type { Booking, Room, RoomMapPosition } from '../lib/types'

/* ==========================================================================
   Mapa 3D — el edificio como pila de losas

   Lee las MISMAS coordenadas que el plano 2D: `room.map` está en % del lienzo,
   así que aquí `x` se vuelve el eje X y `y` (que en CSS crece hacia abajo) se
   vuelve Z, que es justo hacia dónde crece la profundidad vista desde la cámara
   por defecto. El plano y el 3D son la misma planta mirada desde otro sitio, no
   dos layouts que haya que mantener en sincronía.

   La consecuencia a tener presente: mover una sala para que se vea mejor aquí
   también la mueve en el plano 2D. Son un solo dato.

   Este módulo NUNCA debe importarse desde el servidor (three.js necesita WebGL).
   `RoomMap` lo carga con `lazy()` y solo lo monta cuando alguien pide la vista.
   ========================================================================== */

/* Tamaño de una losa en unidades de escena. La proporción (~1.70:1) es la del plano
   a mano del Piso 4, no un número redondo: si no coincide, los rectángulos en % del
   plano llegan estirados y la planta deja de parecerse a la de verdad. */
const FLOOR_W = 12
const FLOOR_D = 7.05
const SLAB_H = 0.14
/** Separación entre losas. Suficiente aire para leer las salas del piso de abajo. */
const LEVEL_GAP = 2.4
/** Altura de una sala. Uniforme: el alto no codifica nada, solo da volumen. */
const ROOM_H = 0.85
/** Cuánto se levanta una sala al pasar el puntero. */
const HOVER_LIFT = 0.18
/** Grosor de las columnas de esquina que amarran las losas. */
const COLUMN_W = 0.16

/* --- Fachada ---------------------------------------------------------------
   Los ventanales de Gerundio van del techo hasta 3/4 de la altura: abajo queda
   un antepecho macizo y el resto es vidrio. Es lo que le da escala al edificio —
   sin esa banda sólida las plantas parecen estantes, no pisos.

   `ROOM_H` (0.85) queda por encima del antepecho a propósito: si el antepecho
   tapara las salas, el mapa dejaría de servir para lo único que sirve.
   -------------------------------------------------------------------------- */

/** Alto libre de una planta: de su losa a la de arriba. */
const WALL_H = LEVEL_GAP - SLAB_H
const SILL_H = WALL_H * 0.25
const GLASS_H = WALL_H - SILL_H
const WALL_T = 0.1
/** Rectángulo útil de la planta: la losa por dentro de la fachada. Ver `toScene`. */
const INNER_W = FLOOR_W - WALL_T * 2
const INNER_D = FLOOR_D - WALL_T * 2
/** Paños de ventanal por fachada. Son el ritmo vertical del edificio. */
const BAYS_X = 12
const BAYS_Z = 7
/* Muy bajo a propósito: el vidrio tiene que dejar leer las salas de dentro, así
   que quien dibuja la fachada son los montantes y el antepecho, no el tinte. */
const GLASS_OPACITY = 0.1

/* Opacidad de las losas. Son translúcidas a propósito: es lo que deja ver las salas
   de las plantas de abajo sin tener que girar el edificio. Una planta sin salas se
   dibuja más tenue para que la vista caiga sola en las que sí tienen. */
const SLAB_OPACITY = 0.5
const SLAB_OPACITY_EMPTY = 0.26

const MIN_DISTANCE = 8
const MAX_DISTANCE = 48
const ZOOM_STEP = 1.25

/** Igual que en `RoomTile`: una sala sin posición no desaparece del mapa. */
const FALLBACK_POS = { x: 5, y: 5, w: 28, h: 24 }

/** Alturas por tipo de elemento fijo. Ver `FixtureKind` en `floorplan.ts`. */
const FIXTURE_H: Record<FixtureKind, number> = {
  nucleo: WALL_H,
  mueble: 0.4,
  area: 0.05,
}

/**
 * Rectángulo del plano (% de la planta) → posición y tamaño en la escena.
 *
 * Lo usan las salas y los elementos fijos por igual: mientras compartan esta única
 * conversión, el plano 2D y el 3D no se pueden desalinear.
 *
 * `pos.x`/`pos.y` son la esquina superior izquierda y una malla se coloca por su
 * centro, de ahí el medio ancho; y el origen de la losa es su centro, no su esquina,
 * de ahí restar la mitad. En CSS `y` crece hacia abajo, que es justo hacia donde
 * crece Z visto desde la cámara por defecto.
 *
 * El 100% es el rectángulo ÚTIL (la losa menos el grueso de la fachada), no la losa.
 * Cuando era la losa, toda sala pegada al perímetro se metía dentro del muro y del
 * ventanal — la Salita Azul, que toca dos fachadas, atravesaba la esquina. Medido
 * contra el interior, una sala al 100% queda a paño con el muro, que es lo correcto.
 */
function toScene(pos: RoomMapPosition) {
  return {
    x: ((pos.x + pos.w / 2) / 100) * INNER_W - INNER_W / 2,
    z: ((pos.y + pos.h / 2) / 100) * INNER_D - INNER_D / 2,
    w: (pos.w / 100) * INNER_W,
    d: (pos.h / 100) * INNER_D,
  }
}

/** Los cuatro tramos de antepecho de una planta. Iguales en todas, se calculan una vez. */
const SILLS: Array<{
  args: [number, number, number]
  position: [number, number, number]
}> = [
  {
    args: [FLOOR_W, SILL_H, WALL_T],
    position: [0, SILL_H / 2, FLOOR_D / 2 - WALL_T / 2],
  },
  {
    args: [FLOOR_W, SILL_H, WALL_T],
    position: [0, SILL_H / 2, -FLOOR_D / 2 + WALL_T / 2],
  },
  // Los laterales se acortan el grosor de los otros dos para no solaparse en las
  // esquinas: dos cajas translúcidas superpuestas dejan una esquina más oscura.
  {
    args: [WALL_T, SILL_H, FLOOR_D - WALL_T * 2],
    position: [FLOOR_W / 2 - WALL_T / 2, SILL_H / 2, 0],
  },
  {
    args: [WALL_T, SILL_H, FLOOR_D - WALL_T * 2],
    position: [-FLOOR_W / 2 + WALL_T / 2, SILL_H / 2, 0],
  },
]

/**
 * Todos los montantes del ventanal en UNA sola geometría de líneas.
 *
 * Una caja por montante serían ~36 mallas por planta, 180 en el edificio. Como
 * líneas es una sola llamada de dibujo por planta, y además se ve mejor: la
 * fachada queda dibujada a lápiz, que es el registro del resto de la app.
 *
 * Es la misma en las cinco plantas, así que se construye una vez y se comparte.
 */
const MULLIONS = (() => {
  const points: number[] = []
  const bottom = SILL_H
  const top = WALL_H

  for (let i = 1; i < BAYS_X; i++) {
    const x = -FLOOR_W / 2 + (FLOOR_W * i) / BAYS_X
    points.push(x, bottom, FLOOR_D / 2, x, top, FLOOR_D / 2)
    points.push(x, bottom, -FLOOR_D / 2, x, top, -FLOOR_D / 2)
  }
  for (let i = 1; i < BAYS_Z; i++) {
    const z = -FLOOR_D / 2 + (FLOOR_D * i) / BAYS_Z
    points.push(FLOOR_W / 2, bottom, z, FLOOR_W / 2, top, z)
    points.push(-FLOOR_W / 2, bottom, z, -FLOOR_W / 2, top, z)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  return geometry
})()

interface RoomMap3DProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  onSelect: (room: Room) => void
}

export default function RoomMap3D({
  rooms,
  bookings,
  now,
  onSelect,
}: RoomMap3DProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)

  const floors = useMemo(() => groupRoomsByFloor(rooms), [rooms])
  const stackHeight = Math.max(0, floors.length - 1) * LEVEL_GAP
  /** De la losa de abajo al techo del PH. Es lo que hay que encuadrar. */
  const buildingHeight = stackHeight + WALL_H
  // La cámara mira a media altura del edificio, no al suelo: apuntar a la base
  // deja el edificio entero en la mitad de arriba de la pantalla.
  const target = useMemo(
    () => new Vector3(0, buildingHeight / 2, 0),
    [buildingHeight],
  )

  /**
   * Acerca/aleja moviendo la cámara sobre su propio eje de visión.
   *
   * No usa los helpers de dolly de OrbitControls porque entran y salen entre
   * versiones de three; mover la posición y llamar a `update()` funciona igual
   * en todas y respeta el damping.
   */
  const zoomBy = (factor: number) => {
    const c = controls.current
    if (!c) return
    const camera = c.object
    const offset = camera.position.clone().sub(c.target)
    const distance = Math.min(
      MAX_DISTANCE,
      Math.max(MIN_DISTANCE, offset.length() * factor),
    )
    camera.position.copy(c.target.clone().add(offset.setLength(distance)))
    c.update()
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        // `flat` = sin tone mapping: ACES apaga los neones de la marca y el aqua
        // dejaba de leerse como el aqua del plano 2D.
        flat
        dpr={[1, 2]}
        // Un tablero de salas está quieto casi todo el tiempo. Con `demand` solo
        // se pinta cuando algo cambia (arrastre, hover, zoom) en vez de quemar
        // 60 fps en una pantalla que puede quedarse abierta todo el día.
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
        // El encuadre se calcula desde el `target` (el centro de la pila), no en
        // absoluto: así añadir una planta a `FLOOR_ORDER` sube la cámara sola en
        // vez de dejar el edificio saliéndose por arriba.
        camera={{
          position: [11, buildingHeight / 2 + 11, 16],
          fov: 32,
          far: 200,
        }}
        fallback={
          <p className="card-empty px-6 py-8">
            Tu navegador no puede dibujar el mapa 3D. Usa la vista de plano.
          </p>
        }
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[6, 14, 8]} intensity={1.5} />
        {/* Relleno desde el lado opuesto: sin él las caras que quedan de espaldas
            al sol se van a negro y las salas de atrás pierden su color de estado. */}
        <directionalLight position={[-9, 6, -7]} intensity={0.5} />

        <Columns stackHeight={stackHeight} />

        {floors.map((floor) => (
          <Floor
            key={floor.name}
            floor={floor}
            bookings={bookings}
            now={now}
            isTop={floor.level === floors.length - 1}
            onSelect={onSelect}
          />
        ))}

        <OrbitControls
          ref={controls}
          makeDefault
          target={target}
          // Arrastrar = girar. El paneo se queda fuera a propósito: con él es
          // trivial mandar el edificio fuera de cuadro y no hay forma de volver.
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          // Nunca por debajo del horizonte: mirar el edificio desde abajo enseña
          // el envés de las losas, que no significa nada.
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>

      <div className="card absolute bottom-6 right-6 flex flex-col overflow-hidden">
        <MapZoomButton
          icon="sumando"
          label="Acercar"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        />
        <MapZoomButton
          icon="restando"
          label="Alejar"
          onClick={() => zoomBy(ZOOM_STEP)}
        />
        <MapZoomButton
          icon="enfocando"
          label="Centrar"
          onClick={() => controls.current?.reset()}
        />
      </div>
    </div>
  )
}

/**
 * Las cuatro columnas de esquina, de la losa de abajo a la de arriba.
 *
 * Son lo único que convierte cinco placas flotando en un edificio: sin ellas no se
 * lee que las plantas pertenecen a la misma estructura ni a qué altura va cada una.
 * Son esquemáticas a propósito — no describen la estructura real del inmueble.
 */
function Columns({ stackHeight }: { stackHeight: number }) {
  // De la cara inferior de la losa de abajo a la cara superior del techo del PH.
  const height = stackHeight + WALL_H + SLAB_H * 2
  // Metidas media columna hacia dentro para que queden a ras del canto de la losa
  // en vez de sobresalir la mitad por fuera.
  const x = FLOOR_W / 2 - COLUMN_W / 2
  const z = FLOOR_D / 2 - COLUMN_W / 2
  const corners: Array<[number, number]> = [
    [x, z],
    [-x, z],
    [x, -z],
    [-x, -z],
  ]

  return (
    <>
      {corners.map(([cx, cz]) => (
        <mesh
          key={`${cx},${cz}`}
          position={[cx, (stackHeight + WALL_H) / 2, cz]}
          // No deben robarle el click ni el hover a las salas que tapan.
          raycast={() => null}
        >
          <boxGeometry args={[COLUMN_W, height, COLUMN_W]} />
          <meshStandardMaterial color={cssColor('--color-ink-200')} />
          <Edges color={cssColor('--color-ink-300')} />
        </mesh>
      ))}
    </>
  )
}

/**
 * La envolvente de una planta: antepecho macizo abajo, ventanal hasta el techo.
 *
 * `terraza` deja el ventanal fuera y el antepecho se lee como pretil. El PH de
 * Gerundio es "Terraza techada" (ver la descripción de El Taller en
 * `rooms.config.ts`), así que acristalarlo sería dibujar un piso que no existe.
 */
function Facade({ terraza }: { terraza: boolean }) {
  const edge = cssColor('--color-ink-300')

  return (
    <>
      {SILLS.map((sill) => (
        <mesh
          key={sill.position.join()}
          position={sill.position}
          raycast={() => null}
        >
          <boxGeometry args={sill.args} />
          <meshStandardMaterial color={cssColor('--color-ink-200')} />
          <Edges color={edge} />
        </mesh>
      ))}

      {!terraza && (
        <>
          {/* Una sola caja de vidrio en vez de cuatro paños: con `DoubleSide` se ven
              igual las dos caras y es una malla en lugar de cuatro. */}
          <mesh
            position={[0, SILL_H + GLASS_H / 2, 0]}
            raycast={() => null}
          >
            <boxGeometry args={[FLOOR_W, GLASS_H, FLOOR_D]} />
            <meshStandardMaterial
              color={cssColor('--color-cielo-300')}
              transparent
              opacity={GLASS_OPACITY}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>

          <lineSegments geometry={MULLIONS} raycast={() => null}>
            <lineBasicMaterial color={edge} />
          </lineSegments>
        </>
      )}
    </>
  )
}

/**
 * Un elemento fijo de la planta: escaleras, baños, cafetería, área de trabajo.
 *
 * Todo en tinta neutra y sin reaccionar al puntero, a propósito: en este mapa lo
 * único accionable son las salas, y si el mobiliario compitiera por atención el
 * estado de las salas —para lo que existe la pantalla— dejaría de saltar a la vista.
 */
function FixtureBox({
  fixture,
  labelled,
}: {
  fixture: Fixture
  labelled: boolean
}) {
  const { x, z, w, d } = toScene(fixture.map)
  const height = FIXTURE_H[fixture.kind]
  const area = fixture.kind === 'area'

  return (
    <group position={[x, height / 2, z]}>
      <mesh raycast={() => null}>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial
          color={cssColor(area ? '--color-ink-100' : '--color-ink-200')}
          transparent
          // El núcleo va translúcido para no tapar las salas que quedan detrás:
          // ocupa toda la altura de la planta y macizo sería una pared opaca.
          opacity={fixture.kind === 'nucleo' ? 0.55 : 1}
          depthWrite={fixture.kind !== 'nucleo'}
        />
        <Edges color={cssColor(area ? '--color-ink-200' : '--color-ink-300')} />
      </mesh>

      {labelled && (
        <Html
          position={[0, height / 2 + 0.12, 0]}
          center
          distanceFactor={13}
          zIndexRange={[4, 0]}
          pointerEvents="none"
        >
          <span className="pointer-events-none text-[10px] whitespace-nowrap text-ink-400 select-none">
            {fixture.name}
          </span>
        </Html>
      )}
    </group>
  )
}

interface FloorProps {
  floor: FloorGroup
  bookings: Booking[]
  now: Date
  /** La última planta es la azotea: no lleva ventanal y sí un techo que la cierra. */
  isTop: boolean
  onSelect: (room: Room) => void
}

/** Una planta: losa, fachada y las salas que tenga encima (puede no tener ninguna). */
function Floor({ floor, bookings, now, isTop, onSelect }: FloorProps) {
  const y = floor.level * LEVEL_GAP
  const empty = floor.rooms.length === 0

  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -SLAB_H / 2, 0]} raycast={() => null}>
        <boxGeometry args={[FLOOR_W, SLAB_H, FLOOR_D]} />
        <meshStandardMaterial
          color={cssColor('--color-ink-100')}
          transparent
          opacity={empty ? SLAB_OPACITY_EMPTY : SLAB_OPACITY}
          // Sin esto una losa translúcida escribe en el buffer de profundidad y
          // recorta a las que quedan detrás: el edificio se veía a trozos al girar.
          depthWrite={false}
        />
        <Edges color={cssColor(empty ? '--color-ink-200' : '--color-ink-300')} />
      </mesh>

      <Facade terraza={isTop} />

      {/* El techo que cierra la terraza del PH. Las demás plantas ya tienen por
          techo la losa de la de arriba. */}
      {isTop && (
        <mesh position={[0, WALL_H + SLAB_H / 2, 0]} raycast={() => null}>
          <boxGeometry args={[FLOOR_W, SLAB_H, FLOOR_D]} />
          <meshStandardMaterial
            color={cssColor('--color-ink-100')}
            transparent
            opacity={SLAB_OPACITY}
            depthWrite={false}
          />
          <Edges color={cssColor('--color-ink-300')} />
        </mesh>
      )}

      {/* La etiqueta cuelga del canto de la losa, no de su centro: ahí no la tapa
          ninguna sala por mucho que gire el mapa. */}
      <Html
        position={[-FLOOR_W / 2 - 0.5, 0, FLOOR_D / 2]}
        center
        distanceFactor={13}
        zIndexRange={[5, 0]}
        pointerEvents="none"
      >
        <span
          className={`badge-neutral pointer-events-none whitespace-nowrap select-none ${
            empty ? 'opacity-50' : ''
          }`}
        >
          {floor.name}
        </span>
      </Html>

      {/* Las escaleras se repiten en las cinco plantas y en la misma posición, así
          que se apilan solas y el hueco de escaleras sale sin modelarlo aparte. En
          las plantas vacías van sin etiqueta: cinco veces "Escaleras" es ruido. */}
      {fixturesForFloor(floor.name).map((fixture) => (
        <FixtureBox key={fixture.name} fixture={fixture} labelled={!empty} />
      ))}

      {floor.rooms.map((room) => (
        <RoomBox
          key={room.resourceEmail}
          view={deriveRoomView(room, bookings, now)}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

interface RoomBoxProps {
  view: RoomView
  onSelect: (room: Room) => void
}

/** Sala como volumen sobre su losa. Click → abre el detalle, igual que en el plano. */
function RoomBox({ view, onSelect }: RoomBoxProps) {
  const { room, status, current, next } = view
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const { x, z, w, d } = toScene(room.map ?? FALLBACK_POS)
  const vars = ROOM_STATUS_VARS[status]
  const style = ROOM_STATUS_STYLES[status]

  const caption = current
    ? `hasta ${mxTimeLabel(current.endTime)}`
    : next
      ? `libre hasta ${mxTimeLabel(next.startTime)}`
      : 'libre todo el día'

  return (
    <group position={[x, ROOM_H / 2 + (hovered ? HOVER_LIFT : 0), z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          onSelect(room)
        }}
        // `stopPropagation` en los dos: sin él, salir de una sala que tapa a otra
        // deja a la de atrás creyendo que sigue con el puntero encima.
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
        <boxGeometry args={[w, ROOM_H, d]} />
        <meshStandardMaterial color={cssColor(vars.fill)} />
        <Edges color={cssColor(vars.edge)} />
      </mesh>

      {/* La etiqueta no intercepta el puntero: si lo hiciera, el hover parpadearía
          al pasar por encima de ella y el arrastre para girar se cortaría ahí. */}
      <Html
        position={[0, ROOM_H / 2 + 0.3, 0]}
        center
        distanceFactor={11}
        zIndexRange={[5, 0]}
        pointerEvents="none"
      >
        <span className="pointer-events-none flex flex-col items-center gap-1 select-none">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold whitespace-nowrap text-ink-950 shadow-sm">
            <span className={`size-2 rounded-full ${style.dot}`} />
            {room.name}
            <span className={`text-[10px] font-bold ${style.text}`}>
              {style.label}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] whitespace-nowrap text-ink-500">
            {caption}
            {room.capacity != null && (
              <>
                <GrndIcon name="conexion" size={10} /> {room.capacity}
              </>
            )}
          </span>
        </span>
      </Html>
    </group>
  )
}

/**
 * Resuelve una variable de `styles.css` al hex que necesita un material.
 *
 * Cachea porque se llama en cada render de cada sala y `getComputedStyle` fuerza
 * un recálculo de estilo. Las variables viven en `@theme static`, así que su valor
 * no cambia en toda la vida de la página y cachear es seguro.
 */
const colorCache = new Map<string, string>()

function cssColor(name: string): string {
  const hit = colorCache.get(name)
  if (hit) return hit
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  // Si la variable no resolviera, un color vacío deja el mesh en negro sin decir
  // por qué; el magenta canta lo suficiente como para que se note en revisión.
  const color = value || '#ff00ff'
  colorCache.set(name, color)
  return color
}
