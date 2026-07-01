import { useState } from 'react'
import { X } from 'lucide-react'
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
        await updateRoomFn({ data: { ...payload, resourceEmail: room!.resourceEmail } })
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isEdit ? 'Editar sala' : 'Nueva sala'}
            </h2>
            <p className="text-sm text-slate-500">
              {isEdit ? room!.resourceEmail : 'Se agregará al mapa de salas'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
