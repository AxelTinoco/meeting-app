import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { getTodayAvailabilityFn } from '../server/bookings'
import { AppHeader } from '../components/AppHeader'
import { NavDrawer } from '../components/NavDrawer'
import { Sidebar } from '../components/Sidebar'
import { RoomsPanel } from '../components/RoomsPanel'
import { AgendaSheet } from '../components/AgendaSheet'
import { UpcomingRail } from '../components/UpcomingRail'
import { WelcomeDrop } from '../components/WelcomeDrop'
import { buildUpcoming } from '../lib/dashboard'
import { useNow } from '../lib/use-now'
import { WELCOME_VALUE, validateWelcome } from '../lib/welcome'

export const Route = createFileRoute('/')({
  // `?bienvenida=si` lo pone el callback de OAuth y significa "esta carga viene de
  // iniciar sesión". Es lo único que separa entrar de recargar.
  //
  // `?bienvenida=si` lo pone el callback de OAuth: esta carga viene de iniciar sesión.
  // El porqué del valor y de no normalizarlo está en `lib/welcome.ts`.
  validateSearch: validateWelcome,
  loader: async () => getTodayAvailabilityFn(),
  component: Dashboard,
})

function Dashboard() {
  // El usuario viene del loader (sesión del servidor), no de un stub del cliente.
  const { rooms, bookings, user, serverNow } = Route.useLoaderData()
  const router = useRouter()
  const now = useNow()

  // La bienvenida se decide en la primera pintada y ya no cambia: el efecto de
  // abajo limpia la URL en cuanto hidrata, y sin esta copia eso mataría la
  // animación a mitad. Así la marca no sobrevive a un F5 ni a compartir el enlace.
  const { bienvenida } = Route.useSearch()
  const [entrando] = useState(bienvenida === WELCOME_VALUE)
  const navigate = useNavigate()

  // Solo existe por debajo de `md`; de ahí en adelante la navegación está
  // siempre a la vista y el drawer ni se monta.
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    if (!bienvenida) return
    navigate({ to: '/', search: {}, replace: true })
  }, [bienvenida, navigate])

  // Hasta que el reloj del cliente arranca (primer render, servidor y navegador) se usa
  // la hora que mandó el servidor: así los estados salen bien desde el HTML inicial y
  // ambos lados pintan lo mismo, que es lo que la hidratación exige.
  const at = now ?? new Date(serverNow)

  const refresh = () => router.invalidate()
  const upcoming = buildUpcoming(bookings, rooms, at)

  return (
    // `h-dvh` y no `h-screen`: en los navegadores de móvil `100vh` cuenta la
    // barra de direcciones como si no existiera, así que la hoja de agenda
    // quedaba cortada por debajo del borde de la pantalla.
    //
    // La columna se vuelve fila en `md`, que es donde entra el riel de iconos;
    // el tercer panel (la agenda como columna) solo cabe a partir de `lg`.
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-white text-ink-900 md:flex-row">
      <AppHeader user={user} onOpenNav={() => setNavOpen(true)} />

      {/* Dos formas del mismo sidebar, alternadas por CSS para que las dos
          salgan ya resueltas en el HTML del servidor. */}
      <Sidebar
        user={user}
        variant="icons"
        scope="rail"
        className="hidden border-r md:flex lg:hidden"
      />
      <Sidebar
        user={user}
        variant="full"
        scope="desktop"
        className="hidden border-r lg:flex"
      />

      <RoomsPanel
        rooms={rooms}
        bookings={bookings}
        now={at}
        user={user}
        onChanged={refresh}
      />

      <UpcomingRail items={upcoming} now={now} className="hidden lg:flex" />
      <AgendaSheet items={upcoming} now={now} />

      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} user={user} />

      {entrando && <WelcomeDrop />}
    </div>
  )
}
