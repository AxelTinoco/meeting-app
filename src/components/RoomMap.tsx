import { Suspense, lazy, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { GrndIcon } from './GrndIcon'
import { MapZoomButton } from './MapZoomButton'
import { RoomTile } from './RoomTile'
import { RoomDetailModal } from './RoomDetailModal'
import { RoomFormModal } from './RoomFormModal'
import { deriveRoomView } from '../lib/dashboard'
import { groupRoomsByFloor } from '../lib/floors'
import { springSnappy } from '../lib/motion'
import type { GrndIconName } from './GrndIcon'
import type { FloorGroup } from '../lib/floors'
import type { Booking, CurrentUser, Room } from '../lib/types'

/* three.js pesa varias veces lo que pesa el resto del bundle y no puede correr en
   el servidor. Con `lazy` el chunk solo se descarga cuando alguien pide la vista
   3D: quien nunca la abre no lo paga, y el SSR nunca lo toca. */
const RoomMap3D = lazy(() => import('./RoomMap3D'))

type MapView = 'plano' | '3d'

interface RoomMapProps {
  rooms: Room[]
  bookings: Booking[]
  now: Date
  user: CurrentUser
  onChanged: () => void
}

/** Lienzo espacial con las salas colocadas según su posición en el mapa. */
export function RoomMap({
  rooms,
  bookings,
  now,
  user,
  onChanged,
}: RoomMapProps) {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)
  /* El 3D abre por default, pero el plano NO deja de ser lo que pinta el servidor:
     se queda debajo mientras el 3D carga (ver abajo). O sea, el HTML inicial sigue
     trayendo las salas y el 3D las releva cuando termina de cargar — nunca hay un
     hueco en blanco, que es lo que la app se propuso evitar desde el principio. */
  const [view, setView] = useState<MapView>('3d')
  /* Pasa a `true` cuando el 3D ya pintó su primer frame, no cuando bajó su chunk.
     Hasta entonces el plano se queda debajo (atenuado, sin recibir clics) con un
     loader encima: así el relevo se lee como "esto está cargando" y no como que
     la vista cambió sola a los dos segundos. */
  const [ready3d, setReady3d] = useState(false)
  const isAdmin = user.role === 'admin'

  /* Desde que las coordenadas son por planta, `room.map` solo tiene sentido dentro de
     su propio piso: dibujar las cinco plantas sobre un mismo lienzo encimaba El Taller
     (PH) con la pecera (Piso 4). En 3D no pasa porque cada una va en su losa; aquí
     hay que elegir planta. */
  const floors = useMemo(() => groupRoomsByFloor(rooms), [rooms])
  const [floorName, setFloorName] = useState(() => busiestFloor(floors))
  const activeFloor = floors.find((f) => f.name === floorName) ?? floors[0]

  // Se re-deriva de `rooms` para reflejar ediciones y cerrarse si la sala se eliminó.
  const selectedRoom =
    rooms.find((r) => r.resourceEmail === selectedEmail) ?? null

  return (
    <div className="relative flex-1 overflow-hidden bg-white">
      {/* Cuadrícula de fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-ink-200) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ink-200) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <MapViewSwitch
        view={view}
        onChange={(next) => {
          // Volver del plano al 3D remonta el canvas: el chunk ya está en caché
          // pero el contexto WebGL y la escena se rehacen. Se vuelve a esperar al
          // primer frame en vez de enseñar el canvas todavía vacío.
          if (next === 'plano') setReady3d(false)
          setView(next)
        }}
      />

      {/* Solo en el plano: en 3D las cinco plantas se ven a la vez y elegir una no
          querría decir nada. */}
      {view === 'plano' && rooms.length > 0 && (
        <FloorSwitch
          floors={floors}
          active={activeFloor.name}
          onChange={setFloorName}
        />
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => setCreatingRoom(true)}
          className="btn-primary absolute right-6 top-6 z-10"
        >
          <GrndIcon name="sumando" size={16} /> Nueva sala
        </button>
      )}

      {rooms.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <p className="card-empty px-6 py-8">No hay salas configuradas.</p>
        </div>
      ) : view === '3d' ? (
        /* La espera NO es una pantalla en blanco ni un cambio de vista a media
           carga: el plano se pinta igual (es lo único que el servidor puede
           mandar — WebGL no existe ahí) pero atenuado y detrás de un loader,
           y el 3D aparece encima cuando de verdad tiene algo que enseñar.
           Antes el plano se veía nítido y usable y de pronto lo relevaba el 3D:
           el salto se leía como un bug, no como una carga. */
        <>
          <div
            aria-hidden={ready3d}
            className={`absolute inset-0 transition-opacity duration-300 ${
              ready3d
                ? 'pointer-events-none opacity-0'
                : 'pointer-events-none opacity-30 blur-[1px]'
            }`}
          >
            <FloorPlan
              floor={activeFloor}
              bookings={bookings}
              now={now}
              onSelect={(r) => setSelectedEmail(r.resourceEmail)}
            />
          </div>

          {!ready3d && <Map3DLoader />}

          {/* `fallback={null}`: quien hace de fallback visible es el bloque de
              arriba, que además sigue montado mientras el canvas arranca — un
              hueco que el Suspense por sí solo no cubre. */}
          <Suspense fallback={null}>
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${
                ready3d ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <RoomMap3D
                rooms={rooms}
                bookings={bookings}
                now={now}
                onSelect={(r) => setSelectedEmail(r.resourceEmail)}
                onReady={() => setReady3d(true)}
              />
            </div>
          </Suspense>
        </>
      ) : (
        <>
          <FloorPlan
            floor={activeFloor}
            bookings={bookings}
            now={now}
            onSelect={(r) => setSelectedEmail(r.resourceEmail)}
          />

          {/* TODO: en el plano estos tres siguen sin hacer nada (nunca lo hicieron).
              En la vista 3D sí mueven la cámara. */}
          <div className="card absolute bottom-6 right-6 flex flex-col overflow-hidden">
            <MapZoomButton icon="sumando" label="Acercar" />
            <MapZoomButton icon="restando" label="Alejar" />
            <MapZoomButton icon="enfocando" label="Centrar" />
          </div>
        </>
      )}

      {selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          bookings={bookings}
          user={user}
          onClose={() => setSelectedEmail(null)}
          onChanged={onChanged}
        />
      )}

      <AnimatePresence>
        {creatingRoom && (
          <RoomFormModal
            key="room-create"
            onClose={() => setCreatingRoom(false)}
            onSaved={onChanged}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Loader de la vista 3D. Pequeño y al centro, sobre el plano atenuado: dice que
 * falta algo por llegar sin tapar lo que ya se puede leer.
 */
function Map3DLoader() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="card flex items-center gap-2.5 px-4 py-2.5">
        <span
          // Un anillo con un cuarto en color: gira sin necesitar keyframes
          // propios. `motion-reduce` lo deja quieto — sigue leyéndose como
          // indicador, solo que sin movimiento.
          className="size-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500 motion-reduce:animate-none"
        />
        <span className="text-sm font-medium text-ink-600">Cargando 3D…</span>
      </div>
    </div>
  )
}

/**
 * Las salas de una planta sobre el lienzo. Es la vista "plano" y, además, lo que se
 * ve mientras baja el 3D.
 */
function FloorPlan({
  floor,
  bookings,
  now,
  onSelect,
}: {
  floor: FloorGroup
  bookings: Booking[]
  now: Date
  onSelect: (room: Room) => void
}) {
  return (
    <div className="absolute inset-0 p-10">
      {/* El plano es lo primero que tiene que verse, así que su entrada no pasa
          por motion: cada sala se escalona sola con un `animation-delay` en CSS
          (ver `tile-enter`). Un contenedor de variantes aquí obligaría a las
          salas a esperar a la hidratación para hacerse visibles. */}
      <div className="relative h-full w-full">
        {floor.rooms.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="card-empty px-6 py-8">
              No hay salas en {floor.name}.
            </p>
          </div>
        ) : (
          floor.rooms.map((room, i) => (
            <RoomTile
              key={room.resourceEmail}
              view={deriveRoomView(room, bookings, now)}
              index={i}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Planta con la que abre el plano: la que más salas tiene.
 *
 * Tiene que ser una función pura de `rooms` y no, por ejemplo, la primera que traiga
 * Calendar: el servidor y el navegador la calculan por separado y si no coincidieran
 * la hidratación repintaría el plano entero. A igualdad gana la más baja, que es la
 * que `groupRoomsByFloor` devuelve primero.
 */
function busiestFloor(floors: FloorGroup[]): string {
  return floors.reduce(
    (best, floor) => (floor.rooms.length > best.rooms.length ? floor : best),
    floors[0],
  ).name
}

/** Selector de planta. Solo en el plano; en 3D se ven las cinco a la vez. */
function FloorSwitch({
  floors,
  active,
  onChange,
}: {
  floors: FloorGroup[]
  active: string
  onChange: (name: string) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Planta"
      // Debajo del selector de vista y no al centro: ahí no tapa ninguna sala, que
      // pueden llegar hasta el borde del lienzo (la Salita Azul empieza en x=0.5%).
      className="card absolute top-20 left-6 z-10 flex overflow-hidden p-1"
    >
      {floors.map((floor) => {
        const isActive = floor.name === active
        return (
          <motion.button
            key={floor.name}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(floor.name)}
            whileTap={{ scale: 0.94 }}
            transition={springSnappy}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-500 text-white'
                : floor.rooms.length === 0
                  ? // Sin salas: se puede entrar, pero no invita. Se sigue listando
                    // para que el plano y el edificio 3D tengan las mismas plantas.
                    'text-ink-400 hover:bg-ink-50'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-brand-600'
            }`}
          >
            {floor.name}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Selector plano ⇄ 3D. Va arriba a la izquierda, fuera del alcance de "Nueva sala". */
function MapViewSwitch({
  view,
  onChange,
}: {
  view: MapView
  onChange: (v: MapView) => void
}) {
  return (
    <div
      // `radiogroup` y no un par de botones sueltos: son dos estados excluyentes
      // de una misma cosa, y así un lector de pantalla anuncia cuál está activo.
      role="radiogroup"
      aria-label="Vista del mapa"
      className="card absolute left-6 top-6 z-10 flex overflow-hidden p-1"
    >
      <ViewOption
        icon="mapeando"
        label="Plano"
        active={view === 'plano'}
        onClick={() => onChange('plano')}
      />
      <ViewOption
        icon="expandiendo"
        label="3D"
        active={view === '3d'}
        onClick={() => onChange('3d')}
      />
    </div>
  )
}

function ViewOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: GrndIconName
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      transition={springSnappy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-500 text-white'
          : 'text-ink-600 hover:bg-ink-50 hover:text-brand-600'
      }`}
    >
      <GrndIcon name={icon} size={16} />
      {label}
    </motion.button>
  )
}
