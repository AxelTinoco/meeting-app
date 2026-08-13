import { useEffect, useId, useState } from 'react'
import { mxMinutesOfTime, mxTimeFromMinutes } from '../lib/mexico-time'
import { parseTimeInput, timeSuggestions } from '../lib/time-input'

interface TimeInputProps {
  /** Hora en formato "HH:MM". */
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
  /** Los pone `<Field>` al clonar: el campo no se nombra a sí mismo. */
  id?: string
  'aria-describedby'?: string
}

const SUGGESTIONS = timeSuggestions()

/**
 * Campo de hora que se puede teclear: "930", "9:30" o "2 pm" se normalizan a
 * "HH:MM" al salir del campo o al presionar Enter. Las flechas ↑/↓ mueven de
 * 15 en 15 minutos y el datalist ofrece las horas de la jornada.
 */
export function TimeInput({
  value,
  onChange,
  required,
  className = 'input',
  ...rest
}: TimeInputProps) {
  const listId = useId()
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)

  // Mientras se escribe mandan las teclas; fuera de eso el campo sigue al padre
  // (que puede empujar el fin cuando cambia el inicio).
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  function commit(raw: string) {
    const parsed = parseTimeInput(raw)
    if (parsed) {
      setDraft(parsed)
      onChange(parsed)
    } else {
      setDraft(value) // texto inservible: volvemos a la hora que ya estaba
    }
  }

  function nudge(deltaMinutes: number) {
    const base = parseTimeInput(draft) ?? value
    const next = mxTimeFromMinutes(mxMinutesOfTime(base) + deltaMinutes)
    setDraft(next)
    onChange(next)
  }

  return (
    <>
      {/* Sin `aria-label`: ganaría a la etiqueta visible del `<Field>` y los dos
          campos de la reserva se anunciarían igual, "Hora (formato 24 h)", sin
          forma de saber cuál es el inicio y cuál el fin (A-02). El formato lo
          cuentan el placeholder y el datalist, que es donde va una descripción. */}
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        list={listId}
        value={draft}
        placeholder="09:30"
        onChange={(e) => {
          setEditing(true)
          setDraft(e.target.value)
        }}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => {
          setEditing(false)
          commit(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            // Sin preventDefault el form se enviaría con el texto a medio normalizar.
            e.preventDefault()
            setEditing(false)
            commit(e.currentTarget.value)
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            setEditing(false)
            nudge(e.key === 'ArrowUp' ? 15 : -15)
          }
        }}
        className={className}
      />
      <datalist id={listId}>
        {SUGGESTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  )
}
