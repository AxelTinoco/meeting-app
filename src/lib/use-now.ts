import { useEffect, useState } from 'react'

/**
 * Reloj compartido del dashboard. Devuelve `null` en el primer render (server y
 * cliente coinciden → sin desajuste de hidratación) y luego el instante actual,
 * refrescándose en cada tick.
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
