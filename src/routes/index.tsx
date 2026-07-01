import { createFileRoute, useRouter } from '@tanstack/react-router'
import { getTodayAvailabilityFn } from '../server/bookings'
import { Sidebar } from '../components/Sidebar'
import { RoomMap } from '../components/RoomMap'
import { UpcomingRail } from '../components/UpcomingRail'
import { getCurrentUser } from '../lib/auth'
import { buildUpcoming } from '../lib/dashboard'
import { useNow } from '../lib/use-now'

export const Route = createFileRoute('/')({
  loader: async () => getTodayAvailabilityFn(),
  component: Dashboard,
})

function Dashboard() {
  const { rooms, bookings, usingMock } = Route.useLoaderData()
  const router = useRouter()
  const user = getCurrentUser()
  const now = useNow()

  const refresh = () => router.invalidate()
  const upcoming = buildUpcoming(bookings, rooms, now)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-slate-900">
      <Sidebar user={user} />
      <RoomMap
        rooms={rooms}
        bookings={bookings}
        now={now}
        usingMock={usingMock}
        onChanged={refresh}
      />
      <UpcomingRail items={upcoming} now={now} />
    </div>
  )
}
