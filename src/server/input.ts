// Helpers para los `validator` de createServerFn.
//
// Los validators son la frontera de confianza: aunque el parámetro venga tipado (eso
// describe el contrato para quien llama desde el cliente), en runtime llega lo que sea
// que el navegador haya mandado en el POST. Normalizar a `Record<string, unknown>` deja
// que leamos campos sin reventar con un TypeError y sin mentirle al type checker.

/** Normaliza input no confiable a un objeto plano. Devuelve `{}` si no es un objeto. */
export function asRecord(data: unknown): Record<string, unknown> {
  return typeof data === 'object' && data !== null
    ? (data as Record<string, unknown>)
    : {}
}
