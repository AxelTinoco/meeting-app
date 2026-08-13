import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { getTodayAvailabilityFn } from '../server/bookings'
import { Sidebar } from '../components/Sidebar'
import { RoomMap } from '../components/RoomMap'
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
    <div className="flex h-screen w-full overflow-hidden bg-white text-ink-900">
      <Sidebar user={user} />
      <RoomMap
        rooms={rooms}
        bookings={bookings}
        now={at}
        user={user}
        onChanged={refresh}
      />
      <UpcomingRail items={upcoming} now={now} />
      {entrando && <WelcomeDrop />}
    </div>
  )
}
