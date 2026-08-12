import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getTodayAvailabilityFn } from '../server/bookings'
import { Sidebar } from '../components/Sidebar'
import { RoomMap } from '../components/RoomMap'
import { UpcomingRail } from '../components/UpcomingRail'
import { buildUpcoming } from '../lib/dashboard'
import { useNow } from '../lib/use-now'

export const Route = createFileRoute('/')({
  loader: async () => getTodayAvailabilityFn(),
  component: Dashboard,
})

function Dashboard() {
  // El usuario viene del loader (sesión del servidor), no de un stub del cliente.
  const { rooms, bookings, user } = Route.useLoaderData()
  const router = useRouter()
  const now = useNow()

  const refresh = () => router.invalidate()
  const upcoming = buildUpcoming(bookings, rooms, now)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-ink-900">
      <Sidebar user={user} />
      <RoomMap
        rooms={rooms}
        bookings={bookings}
        now={now}
        user={user}
        onChanged={refresh}
      />
      <UpcomingRail items={upcoming} now={now} />
    </div>
  )
}
