import { useState } from 'react'
import { X } from 'lucide-react'
import { ModalShell, ModalTitle } from './ModalShell'
import { Field } from './Field'
import { createRoomFn, updateRoomFn } from '../server/rooms'
import type { Room } from '../lib/types'

interface RoomFormModalProps {
  /** Si se pasa, edita esa sala; si no, crea una nueva. */
  room?: Room
  onClose: () => void
  onSaved: () => void
}

export function RoomFormModal({ room, onClose, onSaved }: RoomFormModalProps) {
  const isEdit = room != null
  const [name, setName] = useState(room?.name ?? '')
  const [capacity, setCapacity] = useState(
    room?.capacity != null ? String(room.capacity) : '',
  )
  const [building, setBuilding] = useState(room?.building ?? '')
  const [floor, setFloor] = useState(room?.floor ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        capacity: capacity ? Number(capacity) : undefined,
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
      }
      if (isEdit) {
        await updateRoomFn({
          data: { ...payload, resourceEmail: room.resourceEmail },
        })
      } else {
        await createRoomFn({ data: payload })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No se pudo ${isEdit ? 'guardar' : 'crear'} la sala.`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      overlayClassName="z-50"
      panelClassName="max-w-md p-6"
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <ModalTitle className="text-lg font-semibold text-ink-900">
            {isEdit ? 'Editar sala' : 'Nueva sala'}
          </ModalTitle>
          <p className="text-sm text-ink-500">
            {isEdit ? room.resourceEmail : 'Se agregará al mapa de salas'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Sala Bosque"
            className="input"
          />
        </Field>

        <Field label="Capacidad">
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="Ej. 8"
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Edificio">
            <input
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              placeholder="Ej. Oficina CDMX"
              className="input"
            />
          </Field>
          <Field label="Piso">
            <input
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="Ej. Piso 3"
              className="input"
            />
          </Field>
        </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Edificio">
              <input
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Ej. Gerundio-HQ"
                className="input"
              />
            </Field>
            <Field label="Piso">
              <input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Ej. Piso 4"
                className="input"
              />
            </Field>
          </div>

        {error && (
          <p role="alert" className="alert-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? 'Guardando…'
              : isEdit
                ? 'Guardar cambios'
                : 'Crear sala'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
