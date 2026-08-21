# Design System — Gerundio · Salas

> Documento autocontenido. Contiene todos los tokens, clases y reglas necesarias para
> escribir UI de este proyecto sin leer el código fuente.
>
> **Fuente de verdad en el repo:** `src/styles.css` (colores y clases de componente) y
> `src/lib/motion.ts` (movimiento). Si algo de aquí choca con esos archivos, ganan ellos.

---

## 0. Stack y contexto

| | |
| --- | --- |
| Producto | App web de reservación de salas de junta (tablero operativo, no una landing) |
| UI | React 19 + TypeScript, TanStack Router / Start |
| Estilos | **Tailwind CSS v4** (config en CSS, `@theme` / `@utility` — no hay `tailwind.config.js`) |
| Movimiento | `motion` (Framer Motion v13) |
| Iconos | `lucide-react` + set de marca propio ("gerundios") |
| Deploy | Cloudflare Workers |
| Gestor de paquetes | **pnpm** (nunca `npm install` / `npm run`) |
| Idioma de la UI | Español (MX). Zona horaria `America/Mexico_City`, offset `-06:00` |

---

## 1. Color

### 1.1 Los 8 colores de marca

| Marca | Hex | Token | Uso |
| --- | --- | --- | --- |
| Azul Gerundio | `#465FFF` | `brand-500` | Primario: CTAs, nav activa, logo, foco, estado «reservada» |
| Lavanda | `#D9DEFF` | `brand-200` | Tinte del primario: fondos suaves, bordes |
| Rosa | `#F425AE` | `rosa-400` | Estado «en curso» + acciones destructivas |
| Aqua | `#01FFB4` | `aqua-300` | Disponibilidad («libre») |
| Amarillo | `#DDFF00` | `amarillo-200` | Avisos |
| Azul claro | `#7AF7FF` | `cielo-200` | Información neutra |
| Negro | `#000000` | `black` / `ink-950` | Texto. `ink-950` = `#0B0C14`, el negro con tinte frío del sistema |
| Blanco | `#FFFFFF` | `white` | Fondo de la app |

### 1.2 Por qué hay rampas y no 8 colores sueltos

Cuatro colores de marca son **neón**: sobre blanco su contraste va de 1.14:1 (amarillo) a
3.67:1 (rosa). Ninguno llega al 4.5:1 de WCAG AA para texto. Sirven como **fondo**, no como tinta.

Cada rampa se derivó en **OKLCH** desde su color de marca: se conserva el **matiz exacto** y
solo varía la luminosidad. El hex oficial aparece literal en un paso y los demás pasos cubren
lo que el neón no puede (texto, bordes, hovers). Cada color cae en el paso que le toca por
luminosidad real — por eso el rosa es `400` y el aqua `300`, no ambos `500`.

**Las tres reglas del neón:**

1. Neón puro (`200`/`300`/`400`) → **fondo**, con **texto negro** encima.
2. Texto sobre fondo claro → pasos **`500`–`800`** del mismo matiz.
3. Texto blanco sobre color → `brand-500`, `brand-600`, `rosa-600` o más oscuro.

Los neutros (`ink-*`) **no son gris puro**: llevan el matiz de la marca (270°), así que el gris
combina con el azul en vez de ensuciarlo. Nunca sustituir `ink-*` por `gray-*` o `slate-*`.

### 1.3 Rampas completas

```css
/* Azul Gerundio — primario, acciones, estado "reservada" */
--color-brand-50:  #f8faff;   --color-brand-500: #465fff;  /* Azul Gerundio */
--color-brand-100: #f1f5ff;   --color-brand-600: #2e3bd2;
--color-brand-200: #d9deff;   /* Lavanda */
--color-brand-300: #c5d4ff;   --color-brand-700: #211fb4;
--color-brand-400: #7f9cff;   --color-brand-800: #140085;
                              --color-brand-900: #090058;
                              --color-brand-950: #02002a;

/* Rosa — estado "en curso" y acciones destructivas */
--color-rosa-50:  #fff6fa;    --color-rosa-500: #b5007f;
--color-rosa-100: #ffedf6;    --color-rosa-600: #87005d;
--color-rosa-200: #ffd6ea;    --color-rosa-700: #690048;
--color-rosa-300: #ffb1da;    --color-rosa-800: #45002e;
--color-rosa-400: #f425ae;    /* Rosa */
                              --color-rosa-900: #2b001b;
                              --color-rosa-950: #120009;

/* Aqua — disponibilidad */
--color-aqua-50:  #eefff6;    --color-aqua-400: #00c187;
--color-aqua-100: #deffee;    --color-aqua-500: #008b60;
--color-aqua-200: #aeffd8;    --color-aqua-600: #006746;
--color-aqua-300: #01ffb4;    /* Aqua */
                              --color-aqua-700: #004f35;
                              --color-aqua-800: #003321;
                              --color-aqua-900: #001f12;
                              --color-aqua-950: #000b05;

/* Azul claro — información neutra */
--color-cielo-50:  #e6feff;   --color-cielo-300: #69e3eb;
--color-cielo-100: #cbfcff;   --color-cielo-400: #37adb5;
--color-cielo-200: #7af7ff;   /* Azul claro */
                              --color-cielo-500: #007f85;
                              --color-cielo-600: #005d62;
                              --color-cielo-700: #00474b;
                              --color-cielo-800: #002e30;
                              --color-cielo-900: #001b1d;
                              --color-cielo-950: #00090a;

/* Amarillo — avisos */
--color-amarillo-50:  #f6ffdd;  --color-amarillo-300: #cae900;
--color-amarillo-100: #f0ffc1;  --color-amarillo-400: #98b000;
--color-amarillo-200: #ddff00;  /* Amarillo */
                                --color-amarillo-500: #6d7f00;
                                --color-amarillo-600: #505d00;
                                --color-amarillo-700: #3d4800;
                                --color-amarillo-800: #262e00;
                                --color-amarillo-900: #161b00;
                                --color-amarillo-950: #060900;

/* Neutros — gris frío teñido con el matiz de marca (270°) */
--color-ink-50:  #f8faff;     --color-ink-500: #70727b;
--color-ink-100: #f2f4fa;     --color-ink-600: #51545c;
--color-ink-200: #e5e7ed;     --color-ink-700: #3e4047;
--color-ink-300: #d1d4da;     --color-ink-800: #26282e;
--color-ink-400: #9d9fa7;     --color-ink-900: #16181d;
                              --color-ink-950: #0b0c14;

/* Alias semánticos: los componentes hablan de estados, no de colores */
--color-libre:      var(--color-aqua-300);
--color-activa:     var(--color-rosa-400);
--color-reservada:  var(--color-brand-500);
```

Se declaran en `@theme static` — **`static` es obligatorio**: emite las 66 variables aunque
ninguna utilidad las use. Sin eso Tailwind hace tree-shaking del tema y un
`var(--color-ink-200)` en un `style` inline deja de resolver.

### 1.4 Semántica de estados

Un mismo color significa lo mismo en toda la app (mapa, agenda, tarjetas, modales):

| Estado | Color | Dónde vive |
| --- | --- | --- |
| Libre / disponible | aqua | `ROOM_STATUS_STYLES.free`, `.badge-libre` |
| En curso / ocupada | rosa | `ROOM_STATUS_STYLES.active`, `.badge-activa` |
| Reservada / próxima | azul Gerundio | `ROOM_STATUS_STYLES.reserved`, `.badge-reservada` |
| Aviso | amarillo | `.badge-aviso`, `.chip-neon` |
| Información | azul claro | `.badge-info` |
| Finalizada / inactiva | neutro | `.badge-neutral` |

Los estados de sala se definen una sola vez en `src/lib/dashboard.ts`:

```ts
export const ROOM_STATUS_STYLES: Record<RoomStatus, RoomStatusStyle> = {
  active:   { label: 'ACTIVA',    dot: 'bg-rosa-400',  text: 'text-rosa-600',  tile: 'bg-rosa-50/70',  border: 'border-rosa-300' },
  reserved: { label: 'RESERVADA', dot: 'bg-brand-500', text: 'text-brand-600', tile: 'bg-brand-50/70', border: 'border-brand-300' },
  free:     { label: 'LIBRE',     dot: 'bg-aqua-300',  text: 'text-aqua-700',  tile: 'bg-aqua-50/70',  border: 'border-aqua-200' },
}
```

Cambiar ahí el matiz lo cambia en todo el mapa. **Nunca** hardcodear el color de un estado
en un componente.

### 1.5 Contraste

Todos los pares reales de la UI cumplen WCAG AA. Los más ajustados:

| Par | Ratio |
| --- | --- |
| blanco sobre `brand-500` (botón primario) | 4.84:1 |
| `ink-500` sobre blanco (texto terciario) | 4.79:1 |
| blanco sobre `rosa-600` (botón destructivo) | 9.60:1 |
| negro sobre `aqua-300` (neón sólido) | 15.96:1 |
| negro sobre `amarillo-200` (chip) | 18.38:1 |

Al añadir una combinación nueva: **4.5:1** para texto, **3:1** para bordes e iconos.

---

## 2. Tipografía

No hay webfont: se usa el **system font stack** por defecto de Tailwind (`font-sans`), que
en macOS resuelve a SF Pro y en Windows a Segoe UI. Es deliberado — cero requests de fuente,
cero FOUT, y una app operativa se lee mejor con la fuente del sistema.

**Escala en uso** (no inventar tamaños fuera de esta lista):

| Clase | Uso |
| --- | --- |
| `text-5xl font-extrabold tracking-tight tabular-nums` | Reloj / cifra protagonista |
| `text-xl font-bold` | Título de modal grande (detalle de sala) |
| `text-lg font-bold` / `font-semibold` | Título de sección y de modal |
| `text-base font-semibold` | Nombre de sala en tarjeta |
| `text-sm font-medium` / `font-semibold` | Cuerpo por defecto, labels, items de nav |
| `text-xs font-semibold` | Badges, metadatos, rangos de hora |
| `text-[10px] font-bold tracking-wide` | Etiqueta de estado dentro de una tile |

**Pesos:** `font-medium` (500) para texto interactivo, `font-semibold` (600) para títulos y
badges, `font-bold` / `font-extrabold` solo en cifras y títulos de pantalla.

**Color de texto por jerarquía:**

| Nivel | Token |
| --- | --- |
| Principal | `text-ink-950` (body) / `text-ink-900` (títulos) |
| Secundario | `text-ink-700`, `text-ink-800` |
| Terciario / metadatos | `text-ink-500` |
| Deshabilitado / placeholder | `text-ink-400` |

Usar `tabular-nums` en cualquier número que cambie en vivo (horas, contadores) para que no
salte el ancho.

---

## 3. Forma, espacio y elevación

### 3.1 Radios

| Radio | Dónde |
| --- | --- |
| `rounded-md` | Botones de solo icono |
| `rounded-lg` | Botones, inputs |
| `rounded-xl` | Tarjetas, paneles de modal, items de nav |
| `rounded-full` | Badges, chips, avatares, puntos de estado |

### 3.2 Espaciado

Escala de Tailwind sin modificar. Ritmo habitual: `gap-1.5` (icono ↔ texto), `gap-3`
(elementos de nav), `p-4` (contenedores), `px-4 py-2` (botón), `px-2.5 py-0.5` (badge).

### 3.3 Sombras

Solo dos niveles. `shadow-sm` para todo lo que descansa sobre el fondo (tarjetas, inputs,
botón primario) y `shadow-xl` exclusivamente para el panel de modal. No hay nivel intermedio
y no hace falta.

### 3.4 Capas (z-index)

| z | Capa |
| --- | --- |
| `z-10` | Controles flotantes dentro de una vista (botón sobre el mapa) |
| `z-50` | Modales |
| `z-60` | Diálogo de confirmación (va encima de un modal abierto) |
| `z-70` | Transición de bienvenida (tapa la app entera) |

---

## 4. Clases de componente

Declaradas con `@utility` (**no** con `@layer components`): en Tailwind v4 solo las utilidades
registradas pueden componerse con `@apply`, que es lo que permite construir `btn-primary`
sobre `btn` y `badge-libre` sobre `badge`.

```css
/* --- Formularios --- */
@utility input {
  @apply w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-950 shadow-sm outline-none;
  @apply focus:border-brand-500 focus:ring-2 focus:ring-brand-200;
}
@utility field-label { @apply mb-1 block text-sm font-medium text-ink-700; }

/* --- Botones --- */
@utility btn {
  @apply inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium;
  @apply transition-colors disabled:opacity-50;
}
@utility btn-primary          { @apply btn bg-brand-500 text-white shadow-sm hover:bg-brand-600; }
@utility btn-secondary        { @apply btn border border-ink-200 bg-white text-ink-700 hover:bg-ink-50; }
@utility btn-ghost            { @apply btn text-ink-600 hover:bg-ink-100; }
@utility btn-danger           { @apply btn bg-rosa-600 text-white hover:bg-rosa-500; }
@utility btn-danger-outline   { @apply btn border border-rosa-300 bg-white text-rosa-600 hover:bg-rosa-50; }
@utility btn-icon             { @apply rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700; }
@utility btn-icon-danger      { @apply rounded-md p-1.5 text-ink-400 transition-colors hover:bg-rosa-50 hover:text-rosa-600; }

/* --- Superficies --- */
@utility card          { @apply rounded-xl border border-ink-200 bg-white shadow-sm; }
@utility card-empty    { @apply rounded-xl border border-dashed border-ink-200 text-center text-sm text-ink-500; }
@utility modal-overlay { @apply fixed inset-0 flex items-center justify-center bg-ink-950/50 p-4; }
@utility modal-panel   { @apply w-full rounded-xl bg-white shadow-xl; }

/* --- Badges de estado: texto 700/800 sobre fondo 100 del mismo matiz (todos ≥ 8:1) --- */
@utility badge           { @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold; }
@utility badge-libre     { @apply badge bg-aqua-100 text-aqua-800; }
@utility badge-activa    { @apply badge bg-rosa-100 text-rosa-700; }
@utility badge-reservada { @apply badge bg-brand-100 text-brand-700; }
@utility badge-info      { @apply badge bg-cielo-100 text-cielo-800; }
@utility badge-aviso     { @apply badge bg-amarillo-100 text-amarillo-800; }
@utility badge-neutral   { @apply badge bg-ink-100 text-ink-600; }

/* Chip de neón sólido: color a plena saturación pide texto negro */
@utility chip-neon { @apply inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-black; }

/* --- Mensajes --- */
@utility alert-error { @apply rounded-md bg-rosa-50 px-3 py-2 text-sm text-rosa-700; }
```

**Modales:** no se arman a mano. Existe `<ModalShell>` (`src/components/ModalShell.tsx`), que
compone `modal-overlay` + `modal-panel`, el cierre por click fuera y las variantes de
entrada/salida. Cada modal solo decide el ancho, el padding y su `z-index`. La animación de
salida requiere envolverlo en `<AnimatePresence>`.

---

## 5. Iconografía

Dos pipelines distintos, no mezclarlos.

### 5.1 Los "gerundios" (iconos de marca)

48 iconos propios en `public/icons/grnd/`, nombrados en gerundio (`analizando`, `conectando`,
`iterando`, `sembrando`…). Son PNG gris+alfa y se pintan como **máscara CSS**: el archivo
aporta solo la silueta y el color sale de `currentColor`, así que heredan color en hover, en
estado activo y sobre fondo oscuro, igual que un vectorial.

```tsx
<GrndIcon name="analizando" size={18} />          // decorativo (aria-hidden por defecto)
<GrndIcon name="sumando" rotate={45} label="Cerrar" />  // rotado + accesible
```

- `size` en px, por defecto `18`. Tamaños reales en uso: 12–20 px.
- Cada PNG está recortado a su contenido y recentrado con el dibujo al **87.5%** del lienzo,
  para que todos pesen ópticamente lo mismo.
- Un icono nuevo se agrega al array `GRND_ICONS` de `src/components/GrndIcon.tsx` (el tipo
  `GrndIconName` se deriva de ahí, así que un nombre inválido no compila).

Specs para diseño: lienzo `0 0 48 48`, monocromo puro un solo `fill` negro, trazos expandidos
a formas, grosor mínimo 1.5px sobre el lienzo de 48, legible a **16px**, sin degradados ni
filtros, nombre en `kebab-case` sin acentos ni ñ.

### 5.2 Iconos funcionales (Lucide)

Flechas, cerrar, chevrons, calendario, reloj: `lucide-react`. Lienzo `0 0 24 24`, trazo de 2px
sin expandir, `currentColor`. **No** redibujarlos ni sustituirlos por gerundios salvo que el
gerundio comunique mejor.

---

## 6. Movimiento

Las curvas y tiempos viven en un solo sitio, `src/lib/motion.ts`. Los componentes hablan de
intenciones ("superficie que entra", "elemento de lista"), no de números sueltos.

**Reglas:**

1. **Entrar es más lento que salir.** Al abrir hay que orientar; al cerrar el usuario ya
   decidió y cualquier demora se siente lenta. (`enter` 0.2s easeOut, `exit` 0.14s easeIn.)
2. **Nada dura más de ~300 ms.** Es un tablero operativo, no una landing.
3. **Solo se anima `opacity` y `transform`** (x/y/scale): lo que el compositor resuelve sin
   recalcular layout.

**Presets disponibles:**

| Export | Para qué |
| --- | --- |
| `springSurface` | Superficies que entran (modales, tarjetas). Resorte corto, sin rebote visible |
| `springSnappy` | Micro-interacciones (hover, tap). Más rígido, respuesta inmediata |
| `overlayVariants` / `panelVariants` | Modales. Comparten los nombres `hidden`/`visible`, así el panel hereda el estado del overlay por contexto |
| `staggerContainer(stagger, delay)` | Contenedor de lista: no anima nada propio, solo orquesta el escalonado de sus hijos |
| `clockDigitVariants` | Dígitos del reloj: solo rueda el que cambia; desplazamientos en `%` para que sean independientes del tamaño de letra |
| `railItemVariants` | Tarjetas de la agenda; `custom={true}` las atenúa (reunión terminada) |

**`prefers-reduced-motion` no se maneja componente por componente:**
`<MotionConfig reducedMotion="user">` en `__root.tsx` lo aplica a toda la app. Lo que está en
CSS lo cubre un `@media (prefers-reduced-motion: reduce)` en `styles.css`.

**Las dos excepciones que viven en CSS y no en motion** (ambas deliberadas):

- `tile-enter` — entrada de las salas del mapa. Motion emite su estado `initial` en el HTML del
  servidor, así que una sala con `initial="hidden"` llega al navegador como `opacity: 0` y solo
  aparece al hidratar: el plano se veía en blanco ~550 ms. En CSS la animación arranca con la
  pintura del HTML.
- `welcome-*` (la gota) — transición de sesión al volver del login. El velo tiene que existir
  en el primer frame o no tapa nada. Dura ~1 s (se paga una vez) y anima `mask-image`, las dos
  únicas violaciones de las reglas de arriba, porque la alternativa compositable taparía el
  tablero en vez de descubrirlo.

---

## 7. Accesibilidad

- **Foco:** hay un `:focus-visible` global con `outline: 2px solid var(--color-brand-500)` y
  `outline-offset: 2px`. **No** añadir `focus:ring-*` por componente ni `focus:outline-none`.
- **Contraste:** 4.5:1 texto, 3:1 iconos y bordes. Ver §1.5.
- **Iconos decorativos** van `aria-hidden` (es el default de `GrndIcon`); solo llevan `label`
  cuando son el único contenido de un control.
- Un estado **nunca** se comunica solo por color: siempre hay etiqueta o texto (`LIBRE`,
  `ACTIVA`, `RESERVADA`) junto al punto de color.

---

## 8. Reglas al escribir componentes

1. **Nunca la paleta por defecto de Tailwind.** Nada de `slate-`, `gray-`, `red-`, `amber-`,
   `emerald-`, `sky-`, `violet-`, `rose-`. Solo `brand`, `rosa`, `aqua`, `cielo`, `amarillo`,
   `ink`. Para verificar:

   ```bash
   grep -rnE '(bg|text|border)(-[trblxyse])?-(slate|gray|red|amber|emerald|sky|violet|rose)-' src/
   ```

2. **Antes de escribir utilidades sueltas, busca la clase de componente.** Si un patrón se
   repite (botón, badge, panel), va a `src/styles.css`, no copiado en cada `.tsx`.

3. **El color de un estado no se hardcodea.** Sale de `ROOM_STATUS_STYLES` o de la clase
   `badge-*` correspondiente.

4. **El movimiento sale de `src/lib/motion.ts`.** No inventar `duration` ni `ease` en el
   componente.

5. **`@theme static` no se toca.** Hace que las 66 variables existan siempre; sin eso Tailwind
   las elimina y los `var(--color-*)` en `style` inline dejan de resolver.

6. **El foco no se toca** (ver §7).

7. **Comentarios en español**, explicando el *porqué* de una decisión no obvia, no el *qué*
   del código.

### Checklist antes de dar por buena una pantalla

- [ ] Cero clases de la paleta por defecto de Tailwind
- [ ] Los patrones repetidos usan clase de componente, no utilidades copiadas
- [ ] Ningún neón (`aqua-300`, `amarillo-200`, `cielo-200`) usado como color de texto
- [ ] Todo par texto/fondo nuevo llega a 4.5:1
- [ ] Ningún `focus:outline-none` ni `focus:ring-*` local
- [ ] Las animaciones nuevas salen de `motion.ts` y duran ≤ 300 ms
- [ ] Los números que cambian en vivo llevan `tabular-nums`
- [ ] Los estados se leen sin depender del color
