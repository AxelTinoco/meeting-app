interface IsotipoProps {
  /** Lado de la caja en px. Mismo contrato que `size` de GrndIcon. */
  size?: number
  className?: string
  /**
   * Texto accesible. Por defecto el isotipo es decorativo (`alt=""`), que es lo
   * correcto donde va junto al nombre de la marca escrito al lado o debajo.
   */
  label?: string
}

/**
 * Isotipo de Gerundio: la "G" blanca sobre el círculo azul de marca.
 *
 * Es un PNG y no un SVG porque es el archivo que entrega marca; se sirve el de
 * 192px y se escala por CSS, así que a los tamaños a los que se usa (40-56px)
 * le sobra resolución incluso en pantallas retina. El círculo azul ya viene
 * dentro de la imagen: no hay que envolverlo en una caja `bg-brand-500`.
 */
export function Isotipo({ size = 40, className, label }: IsotipoProps) {
  return (
    <img
      src="/icons/brand/isotipo-192.png"
      alt={label ?? ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  )
}
