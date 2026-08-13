# Design system

Fuente única: `src/styles.css`. Los colores salen de `GRND_Assets.svg` (paleta de marca Gerundio).

## Los 8 colores de marca

| Marca         | Hex       | Token               | Uso                                                                            |
| ------------- | --------- | ------------------- | ------------------------------------------------------------------------------ |
| Azul Gerundio | `#465FFF` | `brand-500`         | Primario: CTAs, nav activa, logo, foco, estado «reservada»                     |
| Lavanda       | `#D9DEFF` | `brand-200`         | Tinte del primario: fondos suaves, bordes                                      |
| Rosa          | `#F425AE` | `rosa-400`          | Estado «en curso» + acciones destructivas                                      |
| Aqua          | `#01FFB4` | `aqua-300`          | Disponibilidad («libre»)                                                       |
| Amarillo      | `#DDFF00` | `amarillo-200`      | Avisos, modo demo                                                              |
| Azul claro    | `#7AF7FF` | `cielo-200`         | Información neutra (p. ej. tipo «entrevista»)                                  |
| Negro         | `#000000` | `black` / `ink-950` | Texto principal. `ink-950` = `#0B0C14`, el negro con el tinte frío del sistema |
| Blanco        | `#FFFFFF` | `white`             | Fondo                                                                          |

## Por qué hay rampas y no 8 colores sueltos

Cuatro de los colores de marca son neón: sobre blanco su contraste va de **1.14:1** (amarillo)
a **3.67:1** (rosa). Ninguno llega al 4.5:1 que pide WCAG AA para texto. Sirven como **fondo**,
no como tinta.

Cada rampa se derivó en OKLCH desde su color de marca: se conserva el **matiz exacto** y solo
varía la luminosidad. Así el hex oficial aparece literal en un paso y los demás pasos cubren lo
que el neón no puede (texto, bordes, hovers). Cada color cae en el paso que le corresponde por
luminosidad real — por eso el rosa es `400` y el aqua `300`, no ambos `500`.

**La regla:**

- Neón puro (`200`/`300`/`400`) → fondo, con **texto negro** encima.
- Texto sobre fondo claro → pasos `500`–`800` del mismo matiz.
- Texto blanco sobre color → `brand-500`, `brand-600`, `rosa-600` o más oscuro.

Los neutros (`ink-*`) no son gris puro: llevan el matiz de la marca (270°), así que el gris
"combina" con el azul en vez de ensuciarlo.

## Estados

Un mismo color significa lo mismo en todos lados (mapa, agenda, tarjetas):

| Estado                | Color         | Definido en                                       |
| --------------------- | ------------- | ------------------------------------------------- |
| Libre / disponible    | aqua          | `ROOM_STATUS_STYLES.free`, `.badge-libre`         |
| En curso / ocupada    | rosa          | `ROOM_STATUS_STYLES.active`, `.badge-activa`      |
| Reservada / próxima   | azul Gerundio | `ROOM_STATUS_STYLES.reserved`, `.badge-reservada` |
| Aviso / demo          | amarillo      | `.badge-aviso`, `.chip-neon`                      |
| Información           | azul claro    | `.badge-info`                                     |
| Finalizada / inactiva | neutro        | `.badge-neutral`                                  |

Los estados de sala viven en `src/lib/dashboard.ts` (`ROOM_STATUS_STYLES`); cambiar ahí el
matiz lo cambia en todo el mapa.

## Clases de componente

Declaradas con `@utility` (no `@layer components`): en Tailwind v4 solo las utilidades
registradas pueden componerse con `@apply`, que es lo que permite construir `btn-primary`
sobre `btn` y `badge-libre` sobre `badge`.

- **Botones** — `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`,
  `btn-danger-outline`, `btn-icon`, `btn-icon-danger`
- **Superficies** — `card`, `card-empty`, `modal-overlay`, `modal-panel`
- **Badges** — `badge-libre`, `badge-activa`, `badge-reservada`, `badge-info`,
  `badge-aviso`, `badge-neutral`, `chip-neon`
- **Formularios** — `input`, `field-label`
- **Mensajes** — `alert-error`

## Reglas al escribir componentes

1. **Nunca la paleta por defecto de Tailwind.** Nada de `slate-`, `violet-`, `emerald-`,
   `rose-`, `amber-`, `sky-`. Solo `brand`, `rosa`, `aqua`, `cielo`, `amarillo`, `ink`.
   Para comprobarlo:

   ```bash
   grep -rnE '(bg|text|border)(-[trblxyse])?-(slate|gray|red|amber|emerald|sky|violet|rose)-' src/
   ```

2. **Antes de escribir utilidades sueltas, busca la clase de componente.** Si un patrón se
   repite (botón, badge, panel), va a `src/styles.css`, no copiado en cada `.tsx`.

3. **El foco no se toca.** `:focus-visible` global en `brand-500`. No añadas `focus:ring-*`
   por componente ni `focus:outline-none`.

4. **`@theme static`** hace que las 66 variables existan siempre, aunque ninguna utilidad las
   use. Sin eso Tailwind las elimina y los `var(--color-*)` en `style` inline
   (la cuadrícula de `RoomMap`) dejarían de resolver.

## Contraste

Los pares de texto de la UI cumplen WCAG AA. Los más ajustados:

| Par                                         | Ratio   |
| ------------------------------------------- | ------- |
| blanco sobre `brand-500` (botón primario)   | 4.84:1  |
| `ink-500` sobre blanco (texto terciario)    | 4.79:1  |
| blanco sobre `rosa-600` (botón destructivo) | 9.60:1  |
| negro sobre `aqua-300` (neón sólido)        | 15.96:1 |
| negro sobre `amarillo-200` (chip demo)      | 18.38:1 |

**`ink-500` es el paso más claro que puede llevar texto.** `ink-400` se queda en 2.64:1, muy
por debajo del 4.5:1 de AA: es para decoración, nunca para letra. Hasta la auditoría de
accesibilidad del 2026-08-13 se usaba como color de texto en ocho sitios, y esta misma
sección afirmaba que *todos* los pares cumplían — no era cierto. La tabla completa, con los
pares que siguen por debajo del umbral, está en [accesibilidad.md](accesibilidad.md).

Al añadir una combinación nueva, verifica que llegue a 4.5:1 (texto) o 3:1 (bordes e iconos).
