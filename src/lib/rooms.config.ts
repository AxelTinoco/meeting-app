import type { Room } from './types'

/** Todas las salas de hoy están en la misma sede; se repite en cada una para no acoplarlas. */
const ADDRESS_HQ = 'dirección de Gerundio-HQ'

/**
 * Primer paso, igual para todas: quien viene de fuera entra por la misma recepción.
 * Vive aparte para que las indicaciones de cada sala empiecen donde se vuelven distintas.
 */
const LLEGADA =
  'Al llegar, di en recepción que vienes a Gerundio y a quién buscas.'

/**
 * Config estática de salas para v1 (decisión: pocas salas fijas).
 *
 * Cada `resourceEmail` debe corresponder a un "recurso de calendario" dado de alta
 * en Admin Console → Directorio → Edificios y recursos. Ese email es el ID que se usa
 * en todas las llamadas a la Calendar API.
 *
 * Para migrar a lectura dinámica (admin.directory.resources.calendars.list) más adelante,
 * basta con reemplazar `listRoomsConfig()` por la llamada al Directory API.
 *
 * `description` y `directions` son el texto que ve un invitado externo en su invitación,
 * no un comentario interno: se escriben en segunda persona y en el orden en que alguien
 * recorre el edificio (recepción → piso → referencia visual).
 *
 * TODO(contenido): falta `ADDRESS_HQ`; hoy sale el placeholder en el correo.
 */
export const ROOMS: readonly Room[] = [
  {
    resourceEmail:
      'c_1885ejlv5j0pqgtunb4st502sviea@resource.calendar.google.com',
    name: 'El Taller',
    capacity: 20,
    building: 'Gerundio-HQ',
    floor: 'PH',
    description: 'Terraza techada, último piso',
    directions: `${LLEGADA} Sube hasta el último piso: la terraza queda a mano izquierda.`,
    address: ADDRESS_HQ,
    // Del plano a mano del PH: a paño con los baños y en su misma banda, ocupando de
    // ahí hasta la fachada derecha. El resto de la azotea queda abierto.
    map: { x: 61, y: 0.5, w: 37.8, h: 48.4 },
    icon: '/icons/rooms/Taller.svg',
  },
  {
    resourceEmail:
      'c_18883h76v9ig8j7cl6seh6lpuh9qa@resource.calendar.google.com',
    name: 'La pecera',
    capacity: 8,
    building: 'Gerundio-HQ',
    floor: 'Piso 4',
    description: 'Sala de vidrio, piso 4',
    directions: `${LLEGADA} Sube al piso 4 y entra: pasando el área de café y el librero, es la sala de vidrio de la izquierda.`,
    address: ADDRESS_HQ,
    // Del plano a mano del Piso 4. El bloque derecho va en tres bandas: la pecera
    // arriba, cafetería y librero en medio, operación abajo — así que la pecera
    // llega solo hasta donde empieza la cafetería (ver `floorplan.ts`).
    map: { x: 69.6, y: 0.8, w: 30.3, h: 34 },
    icon: '/icons/rooms/Pecera.svg',
  },
  {
    resourceEmail:
      'c_1885pmjcmutt6ie4m3nem77hc0c5g@resource.calendar.google.com',
    name: 'Salita Azul',
    capacity: 6,
    building: 'Gerundio-HQ',
    floor: 'Piso 4',
    description: 'Sala chica al fondo, piso 4',
    directions: `${LLEGADA} Sube al piso 4 y cruza el área de trabajo: al fondo está la sala, con mesa y televisor.`,
    address: ADDRESS_HQ,
    // Esquina inferior izquierda del Piso 4, al fondo del área de escritorios.
    map: { x: 0.5, y: 60.5, w: 19.9, h: 39.5 },
    icon: '/icons/rooms/Salita.svg',
  },
] as const

export function listRoomsConfig(): Room[] {
  return ROOMS.map((r) => ({ ...r }))
}

export function findRoom(resourceEmail: string): Room | undefined {
  return ROOMS.find((r) => r.resourceEmail === resourceEmail)
}

/**
 * Etiqueta corta de ubicación. Prefiere la descripción humana y cae a `building · floor`
 * cuando la sala todavía no la tiene, para que salas viejas no se queden sin ubicación.
 */
export function roomLocationLabel(room: Room): string | undefined {
  if (room.description) return room.description
  const parts = [room.building, room.floor].filter(Boolean)
  return parts.length ? parts.join(' · ') : undefined
}

/** Link a Maps de la dirección de la sala, si la tiene. */
export function roomMapsUrl(room: Room): string | undefined {
  if (!room.address) return undefined
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.address)}`
}

/**
 * `location` del evento de Calendar: lo que ve un invitado externo en el correo de
 * invitación, en Gmail y en el móvil.
 *
 * La dirección va al final porque Google geocodifica esa cola para pintar el botón de
 * Maps; el nombre de la sala va al principio porque es lo único que se alcanza a leer
 * en la vista compacta del calendario.
 */
export function roomEventLocation(room: Room): string | undefined {
  const parts = [room.name, roomLocationLabel(room), room.address].filter(
    Boolean,
  )
  return parts.length ? parts.join(', ') : undefined
}

/**
 * Bloque "Cómo llegar" para la descripción del evento.
 *
 * Devuelve undefined si la sala no tiene nada que decir: quien llama omite entonces el
 * campo en el PATCH, en vez de mandar vacío y borrar lo que ya estuviera escrito.
 */
export function roomEventDescription(room: Room): string | undefined {
  if (!room.directions && !room.address) return undefined
  const lines = ['Cómo llegar']
  if (room.directions) lines.push(room.directions)
  if (room.address) lines.push(room.address)
  const maps = roomMapsUrl(room)
  if (maps) lines.push(maps)
  return lines.join('\n')
}
