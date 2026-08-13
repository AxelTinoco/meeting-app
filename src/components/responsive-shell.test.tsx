// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AppHeader } from './AppHeader'
import { NavDrawer } from './NavDrawer'
import { Sidebar } from './Sidebar'
import { RoomsPanel } from './RoomsPanel'
import { AgendaSheet } from './AgendaSheet'
import { UpcomingRail } from './UpcomingRail'
import { BookingModal } from './BookingModal'
import { RoomFormModal } from './RoomFormModal'
import { buildUpcoming } from '../lib/dashboard'
import type { Booking, CurrentUser, Room } from '../lib/types'

const user: CurrentUser = {
  email: 'ana@gerundio.com.mx',
  name: 'Ana Ruiz',
  role: 'admin',
}

const rooms: Room[] = [
  {
    resourceEmail: 'a@resource.calendar.google.com',
    name: 'El Taller',
    capacity: 20,
    floor: 'PH',
    map: { x: 10, y: 10, w: 30, h: 25 },
  },
]

const now = new Date('2026-08-13T17:00:00.000Z')

const bookings: Booking[] = [
  {
    eventId: 'e1',
    roomEmail: 'a@resource.calendar.google.com',
    title: 'Kickoff Volaris',
    startTime: '2026-08-13T10:30:00-06:00',
    endTime: '2026-08-13T11:30:00-06:00',
    organizerEmail: 'ana@gerundio.com.mx',
  },
]

const upcoming = buildUpcoming(bookings, rooms, now)

// La limpieza automática de testing-library se engancha a los hooks globales de
// vitest, y aquí `globals` está apagado (ver vitest.config.ts): sin esto cada
// render se acumula en el mismo document y las búsquedas encuentran de más.
afterEach(cleanup)

test('el riel de iconos y el sidebar completo montan a la vez sin chocar', () => {
  render(
    <>
      <Sidebar user={user} variant="icons" scope="rail" />
      <Sidebar user={user} variant="full" scope="desktop" />
    </>,
  )
  // Dos "Mapa": uno con etiqueta visible, otro solo con aria-label.
  expect(screen.getAllByRole('button', { name: 'Mapa' })).toHaveLength(2)
})

test('el panel de salas pinta plano y lista de la misma selección', () => {
  render(
    <RoomsPanel
      rooms={rooms}
      bookings={bookings}
      now={now}
      user={user}
      onChanged={() => {}}
    />,
  )
  // Una vez en el mapa y otra en la lista; comparten estado, no componente.
  expect(screen.getAllByText('El Taller')).toHaveLength(2)
  expect(screen.getByRole('button', { name: /Nueva sala/ })).toBeDefined()
})

test('la hoja de agenda asoma la reunión en curso y arranca cerrada', () => {
  render(<AgendaSheet items={upcoming} now={now} />)
  const toggle = screen.getByRole('button', { name: 'Desplegar agenda' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(screen.getAllByText('Kickoff Volaris').length).toBeGreaterThan(0)
})

test('header y drawer de móvil montan', () => {
  render(
    <>
      <AppHeader user={user} onOpenNav={() => {}} />
      <NavDrawer open onClose={() => {}} user={user} />
    </>,
  )
  expect(screen.getByRole('button', { name: 'Abrir navegación' })).toBeDefined()
  expect(screen.getByRole('dialog', { name: 'Navegación' })).toBeDefined()
})

test('el riel de escritorio sigue pintando la agenda completa', () => {
  render(<UpcomingRail items={upcoming} now={now} />)
  expect(screen.getByText('Agenda de hoy')).toBeDefined()
  expect(screen.getByText('Kickoff Volaris')).toBeDefined()
})

// Los dos formularios llegaron a esta rama con bloques de campos repetidos (un
// resto de merge): dos "Inicio", dos headcount ligados al mismo estado, dos
// "Edificio"/"Piso". `getBy*` falla si hay más de una coincidencia, así que
// estos tests vuelven a romperse si el duplicado reaparece.
test('el formulario de reserva no repite campos', () => {
  render(<BookingModal room={rooms[0]} onClose={() => {}} onSaved={() => {}} />)
  for (const label of ['Título', 'Fecha', 'Inicio', 'Fin', 'Invitar a']) {
    expect(screen.getByText(label)).toBeDefined()
  }
  // El headcount es uno solo, y es el que nombra la capacidad de la sala.
  expect(screen.getByText('Personas en la sala (capacidad 20)')).toBeDefined()
  expect(screen.queryByText(/^Asistentes/)).toBeNull()
})

test('el formulario de sala no repite campos', () => {
  render(<RoomFormModal onClose={() => {}} onSaved={() => {}} />)
  for (const label of ['Nombre', 'Capacidad', 'Edificio', 'Piso']) {
    expect(screen.getByText(label)).toBeDefined()
  }
})
