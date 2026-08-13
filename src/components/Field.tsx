import { cloneElement, useId } from 'react'
import type { ReactElement } from 'react'

interface FieldProps {
  label: string
  /**
   * Texto de ayuda bajo el campo. Va aparte del `label` a propósito: es una
   * DESCRIPCIÓN, no el nombre del campo. Metido dentro de la etiqueta, el lector
   * de pantalla lo lee pegado al nombre cada vez que el foco entra ("Personas en
   * la sala (capacidad 20) Opcional. Úsalo si van más personas de las que…").
   */
  hint?: React.ReactNode
  /** Si se pasa, sustituye a `hint` y marca el control como inválido. */
  error?: string
  /** Un único control. Recibe `id` y `aria-describedby` por clonado. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
}

/**
 * Campo de formulario: etiqueta, control y texto de ayuda.
 *
 * La etiqueta se asocia con `htmlFor`/`id` y NO envolviendo al control. Envolver
 * parece más simple, pero un `<label>` se asocia al primer control que encuentra
 * dentro, y en cuanto el campo tiene más de uno —`AttendeesInput` mete un botón
 * "Quitar a…" por cada invitado— la etiqueta se la queda ese botón y el campo de
 * verdad se queda sin nombre. Ver A-03 en `docs/accesibilidad.md`.
 *
 * El control se clona para inyectarle `id` y `aria-describedby`: así los dos
 * modales escriben `<Field label="Título"><input …/></Field>` sin tener que
 * inventar y cablear un id cada vez.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const ayuda = error ?? hint
  const ayudaId = ayuda != null ? `${id}-ayuda` : undefined

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>

      {cloneElement(children, {
        id,
        'aria-describedby': ayudaId,
        ...(error ? { 'aria-invalid': true } : null),
      })}

      {ayuda != null && (
        <p
          id={ayudaId}
          // `role="alert"` solo cuando es un error: es lo que hace que se anuncie
          // al aparecer en vez de quedarse esperando a que alguien pase por ahí.
          {...(error ? { role: 'alert' as const } : null)}
          className={
            error ? 'mt-1 text-xs text-rosa-600' : 'mt-1 text-xs text-ink-500'
          }
        >
          {ayuda}
        </p>
      )}
    </div>
  )
}
