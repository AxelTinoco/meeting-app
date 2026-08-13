import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ModalShell } from './ModalShell'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  /** Ejecuta la acción; si lanza, el error se muestra dentro del diálogo. */
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

/** Diálogo modal de confirmación para acciones destructivas (cancelar reserva, eliminar sala). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setError(null)
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo completar la acción.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell
      onClose={onClose}
      overlayClassName="z-[60]"
      panelClassName="max-w-sm overflow-y-auto p-5 sm:p-6"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rosa-100 text-rosa-600">
          <AlertTriangle size={20} />
        </span>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      </div>
      <p className="text-sm text-ink-600">{message}</p>

      {error && <p className="alert-error mt-3">{error}</p>}

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="btn-danger"
        >
          {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
