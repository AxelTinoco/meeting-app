import type { CSSProperties } from 'react'

/**
 * Set de iconos de Gerundio (los "gerundios" de la marca).
 *
 * Los archivos viven en `public/icons/grnd/` como PNG gris+alfa: el original
 * exportado de Slides venía como raster, así que se conserva tal cual en lugar
 * de re-dibujarlo y arriesgar que se desvíe de la marca. Se pintan con
 * `mask-image` + `background-color: currentColor`, de modo que heredan el color
 * del texto igual que un icono vectorial y funcionan sobre cualquier fondo.
 *
 * Cada PNG fue recortado a su contenido y recentrado en un lienzo cuadrado con
 * el contenido al 87.5%, para que todos pesen ópticamente lo mismo (el export
 * original tenía márgenes que variaban entre 58% y 89%).
 */
export const GRND_ICONS = [
  'acercando',
  'agilizando',
  'alcance',
  'analizando',
  'avanzando',
  'bifurcacion',
  'cargando',
  'colaborando',
  'compartiendo',
  'conectando',
  'conexion',
  'creciendo',
  'desarrollando',
  'disenando',
  'emocion',
  'empatizando',
  'enfocando',
  'entendiendo',
  'expandiendo',
  'felicidad',
  'filtrando',
  'fluctuando',
  'ideas',
  'impactando',
  'innovando',
  'inspirando',
  'interactuando',
  'iterando',
  'jerarquizando',
  'mapeando',
  'midiendo',
  'moviendo',
  'pensando',
  'redireccionando',
  'restando',
  'retrocediendo',
  'seleccionando',
  'sembrando',
  'simplificando',
  'sintetizando',
  'sonando',
  'sumando',
  'target',
  'transformando',
  'user-persona',
  'verificando',
  'viendo',
  'vinculando',
] as const

export type GrndIconName = (typeof GRND_ICONS)[number]

interface GrndIconProps {
  name: GrndIconName
  /** Lado de la caja en px. Mismo contrato que `size` de lucide-react. */
  size?: number
  className?: string
  /**
   * Texto accesible. Por defecto el icono es decorativo (`aria-hidden`), que es
   * lo correcto cuando va junto a una etiqueta visible.
   */
  label?: string
  /** Giro en grados; `sumando` a 45° da una cruz de cerrar, por ejemplo. */
  rotate?: number
}

export function GrndIcon({
  name,
  size = 18,
  className,
  label,
  rotate,
}: GrndIconProps) {
  const style = {
    '--grnd-mask': `url(/icons/grnd/${name}.png)`,
    width: size,
    height: size,
    ...(rotate ? { transform: `rotate(${rotate}deg)` } : null),
  } as CSSProperties

  return (
    <span
      className={className ? `grnd-icon ${className}` : 'grnd-icon'}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
