import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { GOOGLE_WORKSPACE_DOMAIN } from '../lib/constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Separadores con los que se confirma un correo, además de Enter. */
const COMMIT_KEYS = ['Enter', 'Tab', ',', ';', ' ']

function isExternal(email: string): boolean {
  return !email.toLowerCase().endsWith(`@${GOOGLE_WORKSPACE_DOMAIN.toLowerCase()}`)
}

/**
 * Un nombre suelto se asume del equipo: "ana" → "ana@gerundio.com.mx".
 * Para invitar a alguien de fuera hay que escribir el correo completo.
 */
function expand(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[,;]+$/, '')
  if (!value) return ''
  return value.includes('@') ? value : `${value}@${GOOGLE_WORKSPACE_DOMAIN}`
}

interface AttendeesInputProps {
  value: string[]
  onChange: (next: string[]) => void
}

export function AttendeesInput({ value, onChange }: AttendeesInputProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Confirma uno o varios correos. Devuelve true si todos entraron. */
  function commit(raw: string): boolean {
    const candidates = raw.split(/[\s,;]+/).map(expand).filter(Boolean)
    if (!candidates.length) return true

    const accepted: string[] = []
    for (const email of candidates) {
      if (!EMAIL_RE.test(email)) {
        setError(`"${email}" no es un correo válido.`)
        return false
      }
      if (!value.includes(email) && !accepted.includes(email)) {
        accepted.push(email)
      }
    }
    setError(null)
    if (accepted.length) onChange([...value, ...accepted])
    return true
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (COMMIT_KEYS.includes(e.key)) {
      // Tab con el campo vacío debe seguir navegando al siguiente control.
      if (!draft.trim()) {
        if (e.key !== 'Tab') e.preventDefault()
        return
      }
      e.preventDefault()
      if (commit(draft)) setDraft('')
      return
    }
    if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  function remove(email: string) {
    onChange(value.filter((e) => e !== email))
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className="input flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1.5 py-1.5"
      >
        {value.map((email) => (
          <span
            key={email}
            className={isExternal(email) ? 'badge-aviso gap-1' : 'badge-neutral gap-1'}
            title={isExternal(email) ? 'Invitado externo' : 'Del equipo'}
          >
            {email}
            <button
              type="button"
              onClick={() => remove(email)}
              className="rounded-full text-current opacity-60 hover:opacity-100"
              aria-label={`Quitar a ${email}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim() && commit(draft)) setDraft('')
          }}
          placeholder={value.length ? '' : 'ana  ·  cliente@empresa.com'}
          className="min-w-[10rem] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-ink-400"
        />
      </div>

      {error ? (
        <p className="mt-1 text-xs text-rosa-600">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-ink-500">
          Enter para agregar. Un nombre suelto se completa con @{GOOGLE_WORKSPACE_DOMAIN};
          para alguien de fuera, escribe el correo completo.
        </p>
      )}
    </div>
  )
}
