// @vitest-environment jsdom

/**
 * Barrera de accesibilidad. Ver `docs/accesibilidad.md` para el porqué de cada caso.
 *
 * Contrato de este archivo:
 *   · Un caso que HOY pasa entra sin `skip` y protege lo que ya funciona.
 *   · Un caso que HOY falla se compromete como `it.skip` citando su ficha
 *     (`A-01`, `A-02`…), y quitarle el `.skip` es la definición de "arreglado".
 * Así `pnpm test` refleja el baseline real sin que ningún hallazgo se pierda de vista.
 * Cada `skip` se comprobó fallando antes de comprometerse: no hay ninguno que
 * pasaría solo por estar mal escrito.
 *
 * Lo que estos tests NO pueden ver, y por eso la auditoría también se hizo a mano:
 *   · Contraste — jsdom no calcula color computado, así que `color-contrast` sale
 *     siempre como "incomplete". Los ratios están en la tabla de la auditoría.
 *   · Reflow y zoom al 200% — hace falta layout de verdad.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Sidebar } from './Sidebar'
import { RoomMap } from './RoomMap'
import { UpcomingRail } from './UpcomingRail'
import { BookingModal } from './BookingModal'
import { RoomFormModal } from './RoomFormModal'
import { RoomDetailModal } from './RoomDetailModal'
import { ConfirmDialog } from './ConfirmDialog'
import { AvailabilityBar } from './AvailabilityBar'
import { buildUpcoming } from '../lib/dashboard'
import type { Booking, CurrentUser, Room } from '../lib/types'

expect.extend(matchers)

/*
 * El tipo del matcher se declara aquí y no se toma del paquete: `vitest-axe`
 * amplía el namespace global `Vi`, que es como se hacía en Vitest 1, y este repo
 * va por Vitest 4, donde lo que se amplía es la interfaz `Matchers` del módulo.
 * Sin esto el matcher funciona pero `tsc` no lo conoce.
 */
declare module 'vitest' {
  interface Matchers<T = any> {
    toHaveNoViolations: () => T
  }
}

// `vitest.config.ts` no activa `globals`, así que el auto-cleanup de Testing
// Library no se registra solo. Sin esto cada test hereda el DOM del anterior y
// axe acaba analizando dos pantallas a la vez.
afterEach(cleanup)

// Las server functions cruzan al Worker; en un test de DOM solo estorban. Los
// modales solo las llaman al enviar, y aquí nunca se envía nada de verdad.
vi.mock('../server/bookings', () => ({
  createBookingFn: vi.fn(),
  updateBookingFn: vi.fn(),
  cancelBookingFn: vi.fn(),
  getTodayAvailabilityFn: vi.fn(),
}))
vi.mock('../server/rooms', () => ({
  createRoomFn: vi.fn(),
  updateRoomFn: vi.fn(),
  deleteRoomFn: vi.fn(),
}))

/* --- Fixtures: salas del edificio y un día con dos reservas ---------------- */

const SALA: Room = {
  resourceEmail: 'c_taller@resource.calendar.google.com',
  name: 'El Taller',
  capacity: 20,
  building: 'Gerundio-HQ',
  floor: 'PH',
  map: { x: 6, y: 8, w: 40, h: 34 },
}

const PECERA: Room = {
  resourceEmail: 'c_pecera@resource.calendar.google.com',
  name: 'La pecera',
  capacity: 8,
  building: 'Gerundio-HQ',
  floor: 'Piso 4',
  map: { x: 54, y: 8, w: 34, h: 30 },
}

const SALAS = [SALA, PECERA]

/** Mediodía del 13 de agosto de 2026, hora de México. */
const AHORA = new Date('2026-08-13T12:00:00-06:00')

const RESERVAS: Booking[] = [
  {
    eventId: 'ev-en-curso',
    roomEmail: SALA.resourceEmail,
    title: 'Revisión de campaña',
    meetingType: 'cliente',
    clientName: 'Volaris',
    startTime: '2026-08-13T11:30:00-06:00',
    endTime: '2026-08-13T13:00:00-06:00',
    organizerEmail: 'ana@gerundio.com.mx',
    roomResponse: 'accepted',
    organizer: {
      email: 'ana@gerundio.com.mx',
      displayName: 'Ana Ruiz',
      response: 'accepted',
      external: false,
    },
    attendees: [
      {
        email: 'beto@gerundio.com.mx',
        displayName: 'Beto Lara',
        response: 'accepted',
        external: false,
      },
      { email: 'cliente@volaris.com', response: 'needsAction', external: true },
    ],
  },
  {
    eventId: 'ev-proxima',
    roomEmail: PECERA.resourceEmail,
    title: 'Entrevista de diseño',
    meetingType: 'entrevista',
    startTime: '2026-08-13T16:00:00-06:00',
    endTime: '2026-08-13T17:00:00-06:00',
    organizerEmail: 'ana@gerundio.com.mx',
    // Recién creada: Google tarda ~15 s en confirmar la sala.
    roomResponse: 'needsAction',
    attendees: [],
  },
]

const ADMIN: CurrentUser = {
  email: 'ana@gerundio.com.mx',
  name: 'Ana Ruiz',
  role: 'admin',
}

/* --- Ejecución de axe ------------------------------------------------------ */

/** Los criterios de la norma. Es lo que se le exige a un componente suelto. */
const NORMA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Un componente suelto no es una página: exigirle landmarks o un `<h1>` sería
 * ruido. Estas reglas solo se encienden sobre el tablero completo.
 */
const ESTRUCTURA = ['best-practice']

function revisar(nodo: HTMLElement, tags: string[] = NORMA) {
  return axe(nodo, { runOnly: { type: 'tag', values: tags } })
}

/** Las mismas tres piezas que compone `routes/index.tsx`, sin el router. */
function Tablero() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-ink-900">
      <Sidebar user={ADMIN} />
      <RoomMap
        rooms={SALAS}
        bookings={RESERVAS}
        now={AHORA}
        user={ADMIN}
        onChanged={() => {}}
      />
      <UpcomingRail items={buildUpcoming(RESERVAS, SALAS, AHORA)} now={AHORA} />
    </div>
  )
}

/* --- Lo que ya cumple: no debe romperse ------------------------------------ */

describe('axe · norma WCAG', () => {
  it('el tablero no tiene violaciones', async () => {
    const { container } = render(<Tablero />)
    expect(await revisar(container)).toHaveNoViolations()
  })

  it('el modal de reserva no tiene violaciones', async () => {
    const { container } = render(
      <BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />,
    )
    expect(await revisar(container)).toHaveNoViolations()
  })

  it('el modal de sala no tiene violaciones', async () => {
    const { container } = render(
      <RoomFormModal onClose={() => {}} onSaved={() => {}} />,
    )
    expect(await revisar(container)).toHaveNoViolations()
  })

  it('el detalle de sala no tiene violaciones', async () => {
    const { container } = render(
      <RoomDetailModal
        room={SALA}
        bookings={RESERVAS}
        user={ADMIN}
        onClose={() => {}}
        onChanged={() => {}}
      />,
    )
    expect(await revisar(container)).toHaveNoViolations()
  })

  it('el diálogo de confirmación no tiene violaciones', async () => {
    const { container } = render(
      <ConfirmDialog
        title="Cancelar reserva"
        message="Se cancelará la reserva."
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    )
    expect(await revisar(container)).toHaveNoViolations()
  })

  it('la barra de disponibilidad no tiene violaciones', async () => {
    const { container } = render(
      <AvailabilityBar
        busy={[
          {
            start: '2026-08-13T11:30:00-06:00',
            end: '2026-08-13T13:00:00-06:00',
          },
        ]}
      />,
    )
    expect(await revisar(container)).toHaveNoViolations()
  })
})

/* --- A-01 · Los modales no son diálogos ------------------------------------ */

describe('A-01 · modales', () => {
  it('el modal de reserva se anuncia como diálogo con nombre', () => {
    render(<BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Reservar sala' })).toBeDefined()
  })

  // El evento se dispara sobre el elemento enfocado, que es lo que pasa en un
  // navegador: `ModalShell` escucha en el overlay y cuenta con que el foco esté
  // dentro. Lanzarlo sobre `document.body` probaría un listener global que no
  // existe a propósito — uno global cerraría también el modal de abajo cuando
  // hay dos apilados.
  it('Escape cierra el modal de reserva', () => {
    const onClose = vi.fn()
    render(<BookingModal room={SALA} onClose={onClose} onSaved={() => {}} />)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('al abrir, el foco entra al modal', () => {
    const { container } = render(
      <BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />,
    )
    const panel = container.querySelector('.modal-panel')
    expect(panel?.contains(document.activeElement)).toBe(true)
  })

  it('Escape cierra el diálogo de confirmación', () => {
    const onClose = vi.fn()
    render(
      <ConfirmDialog
        title="Cancelar reserva"
        message="Se cancelará la reserva."
        onConfirm={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

/* --- A-02 / A-03 · Nombres accesibles de los campos ------------------------ */

describe('A-02 · los dos campos de hora se distinguen', () => {
  // `combobox` y no `textbox`: el `list` del datalist cambia el rol del input.
  it('el campo de inicio se llama "Inicio" y el de fin "Fin"', () => {
    render(<BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />)
    // Antes los dos se anunciaban igual, "Hora (formato 24 h)", y no había forma
    // de saber cuál se estaba editando.
    expect(screen.getByRole('combobox', { name: 'Inicio' })).toBeDefined()
    expect(screen.getByRole('combobox', { name: 'Fin' })).toBeDefined()
  })
})

describe('A-03 · el campo de invitados tiene nombre', () => {
  it('sigue teniendo nombre cuando ya hay un invitado puesto', () => {
    render(
      <BookingModal
        room={SALA}
        booking={{
          ...RESERVAS[0],
          attendees: [
            {
              email: 'beto@gerundio.com.mx',
              response: 'accepted',
              external: false,
            },
          ],
        }}
        onClose={() => {}}
        onSaved={() => {}}
      />,
    )
    // El <label> envolvente se lo queda el primer control que encuentra, que es
    // el botón "Quitar a …" del chip: el input de correos se queda sin nombre.
    expect(screen.getByRole('textbox', { name: /Invitar a/ })).toBeDefined()
  })

  it('su nombre no arrastra el párrafo de ayuda entero', () => {
    render(<BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />)
    const campo = screen.getByRole('textbox', { name: /Invitar a/ })
    // Hoy el nombre es "Invitar a Enter para agregar. Un nombre suelto se
    // completa con @gerundio.com.mx; para alguien de fuera…" — el texto de ayuda
    // vive dentro del <label>, y eso es descripción, no nombre.
    expect(campo.getAttribute('aria-label') ?? '').not.toMatch(/Enter para agregar/)
    expect(
      screen.queryByRole('textbox', { name: /Enter para agregar/ }),
    ).toBeNull()
  })
})

/* --- A-04 · El error del formulario no se anuncia -------------------------- */

describe('A-04 · errores de formulario', () => {
  it('el error de horas es una región viva', () => {
    render(<BookingModal room={SALA} onClose={() => {}} onSaved={() => {}} />)
    // Fin antes que inicio: `handleSubmit` rechaza y pinta el mensaje.
    const fin = screen.getByRole('combobox', { name: 'Fin' })
    fireEvent.change(fin, { target: { value: '08:00' } })
    fireEvent.blur(fin)
    fireEvent.submit(screen.getByRole('button', { name: 'Reservar' }))
    expect(screen.getByRole('alert')).toBeDefined()
  })
})

/* --- A-08 · El nombre de la sala en el mapa se lee de corrido -------------- */

describe('A-08 · sala del mapa', () => {
  it('su nombre accesible se lee, con el estado en palabras', () => {
    render(<Tablero />)
    // Antes era "El TallerACTIVARevisión de campaña · hasta 13:0020": el nombre,
    // el estado, el asunto y la capacidad concatenados sin separación.
    const sala = screen.getByRole('button', {
      name: 'El Taller · activa · Revisión de campaña · hasta 13:00 · capacidad 20',
    })
    expect(sala).toBeDefined()
  })
})

/* --- A-07 · Estructura de la página ---------------------------------------- */

describe('A-07 · landmarks y encabezados', () => {
  it.skip('el tablero tiene la estructura de una página', async () => {
    const { container } = render(<Tablero />)
    // Hoy: axe marca `landmark-unique` (dos <aside> sin nombre que los distinga).
    expect(await revisar(container, ESTRUCTURA)).toHaveNoViolations()
  })

  it.skip('hay un <main> y un <h1>', () => {
    const { container } = render(<Tablero />)
    expect(container.querySelector('main')).not.toBeNull()
    expect(container.querySelector('h1')).not.toBeNull()
  })
})
