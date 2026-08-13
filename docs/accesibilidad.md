# Accesibilidad · Gerundio · Salas

Auditoría del 13 de agosto de 2026, contra **WCAG 2.2 nivel AA**.

El trabajo fue en dos tiempos, ambos el mismo día: primero auditar sin tocar nada, y
después arreglar los siete hallazgos de arriba del backlog. **Las fichas conservan el
diagnóstico original** —con el "antes" medido— y las arregladas llevan su nota de cierre:
el porqué de un arreglo se pierde si solo queda el código.

Los dos instrumentos que miden viven en el repo:

- `eslint-plugin-jsx-a11y` en `eslint.config.js`, con las reglas en `warn`.
- `src/components/a11y.test.tsx`: axe + comprobaciones de comportamiento. Los casos que aún
  fallan están como `it.skip` citando su ficha; **quitarle el `.skip` a un caso es la
  definición de "arreglado"**.

Por qué importa: Salas es la única vía para reservar una sala en Gerundio. Quien no pueda
usarla con teclado o con lector de pantalla no tiene ruta alternativa — tiene que pedirle
a alguien más que reserve por él.

---

## Resumen

| | |
|---|---|
| Hallazgos | **15** — 6 altos, 6 medios, 3 bajos |
| **Arreglados** | **7 de 15** — A-01, A-02, A-03, A-04, A-06, A-08, A-10 |
| Quedan abiertos | 8 — entre ellos A-05 (reflow), el único alto que sigue vivo |
| Detectados por axe | **1** de 15 (A-07) |
| Detectados por lint | **1** de 15 (A-13, con 2 avisos) |
| Detectados a mano o midiendo | **13** de 15 |
| Pares de color medidos | 33 con umbral exigible; **6 por debajo** |

El dato que ordena el resto: **las herramientas automáticas encontraron 1 de los 15
hallazgos.** Todo lo grave de esta app es comportamiento (foco, teclado, qué se anuncia) y
eso axe no lo ve. Cualquier plan que se apoye solo en el CI va a declarar victoria con los
modales todavía inusables.

**Los tres que más dolían:** los modales no eran diálogos (A-01) — se abrían sin llevarse el
foco, no cerraban con Escape y el lector de pantalla ni se enteraba de que se había abierto
algo; los dos campos de hora se anunciaban idénticos (A-02) — no había forma de saber si
estabas editando el inicio o el fin; y al 200 % de zoom la agenda del día desaparece sin
scroll que la recupere (A-05). Los dos primeros están arreglados. **El reflow no**, y es el
único alto que sigue abierto: es el que toca el diseño visible.

---

## Cómo se hizo

1. **Lint** — `pnpm lint` con jsx-a11y. 17 avisos en bruto, de los que **15 eran falsos
   positivos** de dos reglas que no pueden ver a través del componente `Field` (recibe el
   control por `children`, y la regla es estática). Esas dos reglas quedaron apagadas con
   el motivo escrito en `eslint.config.js`; una regla que grita 15 veces sin razón enseña a
   ignorar el lint entero. Quedan 2 avisos reales.
2. **axe** — `pnpm test`, sobre cada superficie. 1 violación.
3. **Nombres accesibles** — se calculó el nombre real (algoritmo ARIA) de cada control del
   modal de reserva y del mapa. De aquí salen A-02, A-03 y A-08, que ninguna herramienta
   marcaba.
4. **Comportamiento** — Escape, foco al abrir, foco atrapado: comprobado con Testing
   Library, no supuesto.
5. **Contraste** — calculado sobre las rampas de `src/styles.css`, no estimado a ojo. axe no
   puede: en jsdom no hay color computado y la regla sale siempre como "incomplete".
6. **Reflow** — leído de las clases de layout, con los números abajo.

**Lo que NO se pudo verificar y queda pendiente:** el recorrido en un navegador real con
lector de pantalla (VoiceOver/NVDA). La app exige sesión OAuth de `@gerundio.com.mx` y no
hay modo demo desde el 2026-08-12, así que ese paso necesita que alguien con cuenta abra
`pnpm dev` y lo recorra. Todo lo de este documento está medido sin eso; el recorrido real
puede añadir hallazgos, no quitar los que hay.

---

## Hallazgos

Las líneas que se citan son las del momento de la auditoría, antes de arreglar nada: sirven
para entender el diagnóstico, no para navegar el código de hoy.

### A-01 · Los modales no son diálogos &nbsp;&nbsp; `[Alto]` `[WCAG 2.1.2, 2.4.3, 4.1.2]`

**Dónde:** `src/components/ModalShell.tsx` (todo el componente) y sus cuatro consumidores:
`BookingModal.tsx:136`, `RoomFormModal.tsx:57`, `RoomDetailModal.tsx:90`, `ConfirmDialog.tsx:41`.

**Qué pasa:** `ModalShell` pinta dos `<div>` sin más. Medido:

- `role="dialog"`: **0 elementos**. Para un lector de pantalla no se abrió nada; sigue
  leyendo el tablero de abajo como si el modal no existiera.
- **Escape no cierra** (`onClose` recibe 0 llamadas). La única salida son los botones
  "Cerrar"/"Cancelar" o hacer clic fuera, que con teclado no existe.
- **El foco no entra al modal**: al abrir, `document.activeElement` sigue siendo `<body>`.
  Quien navega con Tab tiene que atravesar el tablero entero para llegar al formulario.
- **El foco no queda atrapado ni se devuelve**: se puede tabular al fondo, que sigue
  operable, y al cerrar el foco no vuelve al botón que lo abrió.

El clic fuera para cerrar (`ModalShell.tsx:29`) es, además, una acción sin equivalente de
teclado.

**Detectado:** a mano. axe no marca nada — un `<div>` sin rol no infringe ninguna regla suya.

**Arreglo:** en `ModalShell`, `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
apuntando al `<h2>` que cada modal ya tiene; `onKeyDown` con Escape → `onClose`; enfocar el
panel al montar y devolver el foco al desmontar; `inert` en el fondo mientras haya modal.
Se arregla una vez en `ModalShell` y lo heredan los cuatro. Ojo con `RoomDetailModal`, que
abre sub-modales encima: el de arriba manda.

**Tests:** `a11y.test.tsx` → `A-01 · modales` (4 casos).

> **Arreglado (2026-08-13)** en `ModalShell.tsx`, y con eso en los cuatro modales a la vez.
> El panel es `role="dialog"` + `aria-modal` y toma su nombre del `<h2>`, que ahora se pinta
> con `<ModalTitle>`: el id viaja por contexto para que el rótulo visible y el anunciado no
> puedan separarse. Escape se atiende en el overlay y no en `document` — con modales
> apilados un listener global cerraría también el de abajo, mientras que el foco vive en el
> panel de arriba y su evento no llega al de atrás. Al abrir se enfoca el panel (no su primer
> control, para que se anuncie el título antes que "botón cerrar"), Tab cicla dentro y al
> cerrar el foco vuelve a quien lo abrió.
>
> Queda fuera `inert` en el fondo: con la trampa de foco y `aria-modal` el fondo ya no se
> alcanza ni con teclado ni con lector, y `inert` obligaría a que `ModalShell` conociera el
> árbol de la app.

**Costo: M**

---

### A-02 · Los dos campos de hora se anuncian igual &nbsp;&nbsp; `[Alto]` `[WCAG 2.5.3, 3.3.2]`

**Dónde:** `src/components/TimeInput.tsx:63`, usado en `BookingModal.tsx:218-223`.

**Qué pasa:** el campo lleva `aria-label="Hora (formato 24 h)"`, y en el algoritmo de nombre
accesible `aria-label` **gana** sobre el `<label>` visible. Nombres reales medidos en el
modal de reserva:

```
input[text] -> "Título"
input[date] -> "Fecha"
input[text] -> "Hora (formato 24 h)"     <- el que la pantalla rotula "Inicio"
input[text] -> "Hora (formato 24 h)"     <- el que la pantalla rotula "Fin"
```

Los dos campos son indistinguibles al oído. Y como el nombre accesible no contiene el texto
visible, también rompe 2.5.3 (Label in Name): un usuario de control por voz que dice
"clic en Inicio" no activa nada.

**Arreglo:** quitar el `aria-label` fijo y dejar que mande el `<label>`; lo del formato 24 h
es una **descripción**, no un nombre — va en un `<p id>` referenciado con `aria-describedby`,
o directamente en el `placeholder` que ya dice `09:30`.

**Tests:** `A-02 · los dos campos de hora se distinguen`.

> **Arreglado (2026-08-13)**: fuera el `aria-label` de `TimeInput`. Medido después: `"Inicio"`
> y `"Fin"`. El formato lo cuentan el placeholder (`09:30`) y el datalist, que es donde va una
> descripción. Detalle para quien escriba el test: el `list` del datalist convierte el input
> en `combobox`, no `textbox`.

**Costo: S**

---

### A-03 · El campo de invitados se queda sin nombre &nbsp;&nbsp; `[Alto]` `[WCAG 4.1.2, 3.3.2]`

**Dónde:** `src/components/AttendeesInput.tsx:97`, dentro del `Field` de `BookingModal.tsx:226`.

**Qué pasa:** `Field` (`BookingModal.tsx:279`) envuelve el control con un `<label>`, y ese
label se asocia al **primer control que encuentra**. `AttendeesInput` mete varios: cada
invitado ya puesto es un chip con su botón "Quitar a …", y esos van antes que el input de
correos. Nombres medidos:

| | sin invitados | con 1 invitado ya puesto |
|---|---|---|
| botón del chip | — | `"Quitar a beto@gerundio.com.mx"` |
| input de correos | `"Invitar a Enter para agregar. Un nombre suelto se completa con @gerundio.com.mx; para alguien de fuera, escribe el correo completo."` | `""` |

O sea: **en cuanto hay un invitado, el campo se queda sin nombre**, que es el caso normal al
editar una reserva. Y cuando sí lo tiene, arrastra el párrafo de ayuda entero, porque el
`<p>` de `AttendeesInput.tsx:117` también vive dentro del `<label>`.

El mismo patrón afecta a "Personas en la sala", cuyo nombre es
`"Personas en la sala (capacidad 20) Opcional. Úsalo si van más personas de las que
invitaste por correo."`.

**Detectado:** a mano (lint lo marcaba, pero entre 15 falsos positivos del mismo tipo).

**Arreglo:** que `Field` deje de envolver y pase a `htmlFor` + `id` explícitos, y que el
texto de ayuda salga del `<label>` y se enganche con `aria-describedby`. Es un cambio en un
solo componente que arregla los dos modales a la vez.

**Tests:** `A-03 · el campo de invitados tiene nombre` (2 casos).

> **Arreglado (2026-08-13)**: el `Field` duplicado en los dos modales se unificó en
> `src/components/Field.tsx` y dejó de envolver — ahora asocia con `htmlFor`/`id` y clona el
> control para inyectarle el id, así que el punto de asociación no depende de qué haya dentro.
> El texto de ayuda salió de la etiqueta y va por `aria-describedby`. Medido después:
> `"Invitar a"` (con y sin invitados) y `"Personas en la sala (capacidad 20)"` sin el párrafo
> pegado.

**Costo: S**

---

### A-04 · Los errores del formulario no se anuncian &nbsp;&nbsp; `[Alto]` `[WCAG 3.3.1, 4.1.3]`

**Dónde:** `BookingModal.tsx:252`, `RoomFormModal.tsx:141`, `ConfirmDialog.tsx:54`,
`AttendeesInput.tsx:115`.

**Qué pasa:** el `<p class="alert-error">` aparece en el DOM sin región viva y sin quedar
asociado al campo culpable. Quien no ve la pantalla envía el formulario, no oye nada, y lo
único que percibe es que el modal no se cerró. Aplica a los tres errores que la app puede
producir: fin antes que inicio, fallo del servidor al guardar, y correo mal escrito.

**Arreglo:** `role="alert"` en el `<p>` (o `aria-live="assertive"` en un contenedor que
siempre exista); `aria-invalid` + `aria-describedby` en el campo señalado. Para el error de
horas, además, mover el foco al campo de inicio.

**Tests:** `A-04 · errores de formulario`.

> **Arreglado (2026-08-13)**: `role="alert"` en los cuatro mensajes. El de `AttendeesInput`
> además comparte id con su texto de ayuda —se turnan— para que el `aria-describedby` del
> campo sea fijo y siempre apunte a lo que haya, y marca `aria-invalid`. `Field` hace lo mismo
> cuando recibe `error`.
>
> No se movió el foco al campo culpable: es un cambio de comportamiento que conviene ver en
> uso antes de decidirlo.

**Costo: S**

---

### A-05 · Al 200 % de zoom se pierde la agenda &nbsp;&nbsp; `[Alto]` `[WCAG 1.4.10, 1.4.4]`

**Dónde:** `src/routes/index.tsx:50`, `Sidebar.tsx:25`, `UpcomingRail.tsx:32`,
`styles.css:216` (`modal-overlay`).

**Qué pasa:** dos problemas de la misma familia.

**El tablero.** El contenedor es `flex h-screen w-full overflow-hidden` y las dos columnas
laterales son `shrink-0`: sidebar `w-60` (240 px) y riel `w-80` (320 px). Son 560 px que no
ceden, dentro de un contenedor que no deja hacer scroll.

| ancho CSS efectivo | qué queda para el mapa | qué pasa |
|---|---|---|
| 1280 px (100 %) | 640 px | bien |
| 640 px (zoom 200 % sobre 1280) | 0 px | el mapa desaparece |
| 320 px (mínimo que exige 1.4.10) | −320 px | el riel de la agenda queda cortado fuera de pantalla, **sin scroll que lo alcance** |

`overflow-hidden` es lo que convierte esto en pérdida de contenido en vez de una barra de
scroll fea: la agenda del día no se puede recuperar de ninguna manera.

**Los modales.** `modal-overlay` es `fixed inset-0 flex items-center justify-center p-4` sin
`overflow-y`. Un panel centrado más alto que la ventana se desborda por arriba **y** por
abajo, y no hay scroll: al 200 % de zoom el formulario de reserva —que es largo— pierde sus
primeros campos. `RoomDetailModal` se salva porque acota a `max-h-[85vh]` con scroll interno
(`:93`, `:141`); `BookingModal` y `RoomFormModal` no.

**Arreglo:** el tablero, apilar en columna por debajo de cierto ancho y permitir scroll
vertical (quitar `overflow-hidden` del contenedor raíz, o cambiarlo por `overflow-auto`).
Los modales, `overflow-y: auto` en `modal-overlay` y `max-h` con scroll interno en el panel,
como ya hace el detalle de sala. Es el hallazgo más caro porque toca el diseño visible.

**Detectado:** a mano, leyendo el layout. Pendiente de confirmar en navegador. **Costo: L**

---

### A-06 · `text-ink-400` no alcanza contraste de texto &nbsp;&nbsp; `[Alto]` `[WCAG 1.4.3]`

**Qué pasa:** `ink-400` (`#9d9fa7`) sobre blanco da **2.64:1**. AA pide 4.5:1 para texto
normal. Se usa como color de texto en 8 sitios:

| Dónde | Qué texto |
|---|---|
| `Sidebar.tsx:81` | el correo del usuario |
| `Sidebar.tsx:89` | el icono de cerrar sesión (aquí el umbral es 3:1, también falla) |
| `RoomTile.tsx:67` | la capacidad de la sala |
| `UpcomingRail.tsx:97` | la fecha bajo el reloj |
| `UpcomingRail.tsx:119` | el AM/PM del reloj |
| `UpcomingRail.tsx:239` | el nombre de la sala en cada tarjeta |
| `RoomDetailModal.tsx:146` | el contador de reservas |
| `styles.css:200,204` | `btn-icon` y `btn-icon-danger` en reposo |

Además `AttendeesInput.tsx:110` lo usa de color de placeholder, y el placeholder ahí lleva
información (`ana · cliente@empresa.com`).

**Esto contradice la documentación del propio repo.** `docs/design-system.md:90` afirma
«Todos los pares reales de la UI cumplen WCAG AA», y no es cierto. Al corregir esto hay que
corregir esa línea. (Menor, del mismo tipo: el comentario de `styles.css:225` dice que los
badges están «todos ≥ 8:1»; `badge-neutral` está en 6.89:1.)

**Arreglo:** subir esos usos a `ink-500` (4.79:1, el paso que la app ya usa para texto
terciario). `ink-400` se queda para lo decorativo. Es buscar y reemplazar en 8 líneas.

**Detectado:** medido. axe lo deja en "incomplete" porque jsdom no computa color.

> **Arreglado (2026-08-13)**: los nueve usos pasaron a `ink-500` (4.79:1), incluido el
> placeholder de `AttendeesInput` y el eje de `AvailabilityBar`. Ya no queda ni un
> `text-ink-400` en `src/`. La afirmación falsa de `design-system.md` está corregida y esa
> sección ahora dice explícitamente que `ink-500` es el paso más claro que puede llevar texto.

**Costo: S**

---

### A-07 · El tablero no tiene estructura de página &nbsp;&nbsp; `[Medio]` `[WCAG 1.3.1, 2.4.1, 2.4.6]`

**Dónde:** `src/routes/index.tsx:50`, `Sidebar.tsx:25`, `UpcomingRail.tsx:32`.

**Qué pasa,** medido sobre el tablero renderizado:

- `<main>`: **0**. No hay contenido principal que declarar, así que "saltar al contenido"
  no tiene destino. axe lo marca además como `region` (contenido fuera de landmarks).
- Encabezados: el primero de la página es un `<h2>` ("Agenda de hoy"). **No hay `<h1>`**, y
  el mapa de salas —que es el contenido principal— no tiene ningún encabezado.
- `<aside>`: **2, ninguno con nombre accesible**. Es la única violación que axe encontró en
  toda la app: `landmark-unique`. Quien navega por landmarks ve "complementary,
  complementary" y no sabe cuál es el menú y cuál la agenda.
- No hay enlace "saltar al contenido": con teclado hay que atravesar los 6 controles del
  sidebar en cada carga antes de llegar al mapa.

La pantalla de login sí está bien (`login.tsx:46` tiene `<main>` y `:57` un `<h1>`).

**Arreglo:** envolver el mapa en `<main>` con un `<h1>` (puede ir en `sr-only` si el diseño
no quiere el título a la vista); `aria-label` en cada `<aside>` ("Navegación", "Agenda de
hoy"); un enlace de salto al principio del `<body>` en `__root.tsx`.

**Tests:** `A-07 · landmarks y encabezados` (2 casos). **Costo: M**

---

### A-08 · El nombre de la sala en el mapa se lee de corrido &nbsp;&nbsp; `[Medio]` `[WCAG 1.3.1, 4.1.2]`

**Dónde:** `src/components/RoomTile.tsx:47-72`.

**Qué pasa:** toda la tarjeta es un solo `<button>`, así que su nombre accesible es la
concatenación de todo lo que hay dentro, sin separadores. Medido:

```
"El TallerACTIVARevisión de campaña · hasta 13:0020"
```

"El TallerACTIVA" y "13:0020" (la hora de fin pegada a la capacidad) no se leen. Al mismo
tiempo, el estado depende del color del borde y del punto — el texto `ACTIVA` está ahí, pero
pegado al nombre no cumple su función.

**Arreglo:** un `aria-label` compuesto y legible en el botón
(`"El Taller · ocupada hasta las 13:00 · capacidad 20"`) con `aria-hidden` en el contenido
visual, o separadores reales entre los `<span>`.

**Tests:** `A-08 · sala del mapa`.

> **Arreglado (2026-08-13)**: `aria-label` compuesto en `RoomTile`. Medido después:
> `"El Taller · activa · Revisión de campaña · hasta 13:00 · capacidad 20"`. El estado va en
> palabras porque en la pantalla lo llevan el color del borde y del punto.

**Costo: S**

---

### A-09 · Información que solo vive en `title` &nbsp;&nbsp; `[Medio]` `[WCAG 1.3.1, 1.4.1]`

**Dónde:** `AvailabilityBar.tsx:21`, `RoomDetailModal.tsx:186`, `RoomDetailModal.tsx:202`,
`UpcomingRail.tsx:288`, `AttendeesInput.tsx:84`.

**Qué pasa:** el atributo `title` solo aparece al posar el ratón. No existe para teclado ni
para pantalla táctil, y los lectores de pantalla lo tratan de forma inconsistente. Hoy es el
único portador de:

- el horario de cada bloque ocupado en la barra de disponibilidad,
- el porqué de "Confirmando sala…",
- la respuesta de cada invitado (`"beto@… — Aceptó"`) — que además solo se distingue por el
  color del badge,
- quiénes son las personas detrás del "+N" de la pila de avatares,
- si un invitado es externo (junto con una flecha `↗` que el lector lee como "flecha").

**Arreglo:** llevar el dato al texto accesible del elemento (`aria-label` en el "+N", texto
visible o `sr-only` para la respuesta del invitado, "externo" escrito en vez de la flecha).
Para la barra de disponibilidad, una lista `sr-only` con los intervalos.

**Nota:** `AvailabilityBar` **no está montada en ninguna pantalla** (ver A-15), así que este
trozo del hallazgo es latente, no algo que un usuario sufra hoy. **Costo: M**

---

### A-10 · El anillo de foco desaparece sobre los botones de marca &nbsp;&nbsp; `[Medio]` `[WCAG 1.4.11, 2.4.11]`

**Dónde:** `src/styles.css:131`.

**Qué pasa:** el foco global es `outline: 2px solid var(--color-brand-500)`. Sobre blanco da
4.84:1 y se ve bien. Pero `btn-primary` es `bg-brand-500`: **el anillo y el botón son el
mismo color, 1.00:1**. Y en hover (`brand-600`), 1.62:1. Los botones más importantes de la
app —"Reservar", "Nueva reserva", "Nueva sala", "Continuar con Google"— son justo esos.

**Arreglo:** añadir `outline-offset` con un halo blanco (`box-shadow: 0 0 0 4px #fff`
por dentro del outline), o cambiar el color del anillo a `ink-950` sobre fondos de marca.
Una línea en `styles.css`.

> **Arreglado (2026-08-13)**: anillo de dos tonos — halo blanco pegado al control (el
> `spread` iguala al `outline-offset`) y anillo `ink-950` por fuera. Siempre hay un borde que
> contrasta: sobre fondo claro se ve el anillo (19.5:1 contra blanco), sobre fondo de marca se
> ve el halo (4.84:1 contra `brand-500`, 7.86:1 contra `brand-600`). Un anillo de un solo
> color siempre tiene un fondo contra el que desaparece; por eso no bastaba cambiarlo de tono.

**Costo: S**

---

### A-11 · Botones que no hacen nada &nbsp;&nbsp; `[Medio]` `[WCAG 4.1.2]`

**Dónde:** `Sidebar.tsx:38-66` (5 botones) y `RoomMap.tsx:78-80` (3 `ZoomButton`).

**Qué pasa:** ocho controles anunciados como botones enfocables no tienen `onClick`. Uno
además dice `aria-current="page"` (`Sidebar.tsx:41`) sin ser un enlace ni navegar a ninguna
parte. Con teclado son ocho paradas muertas antes de llegar al contenido; con lector de
pantalla, ocho promesas falsas.

**Arreglo:** conectarlos (el comentario de `Sidebar.tsx:51` ya prevé el `layoutId` para
cuando existan las rutas) o marcarlos `disabled` mientras tanto. Cuando sean navegación de
verdad, deben ser `<a>`/`<Link>`, no `<button>` — y entonces `aria-current="page"` sí
corresponde.

**Costo: S** (marcarlos) / **M** (conectarlos)

---

### A-12 · El botón de quitar invitado mide 12 px &nbsp;&nbsp; `[Medio]` `[WCAG 2.5.8]`

**Dónde:** `src/components/AttendeesInput.tsx:87-94`.

**Qué pasa:** el botón lleva un icono de 12 px sin padding, así que su área objetivo es de
~12×12 px. WCAG 2.2 pide 24×24 px como mínimo. En móvil es prácticamente imposible de
acertar, y el error tiene consecuencia real: quitas al invitado equivocado de una junta.

El resto de los botones de icono sí cumplen: `btn-icon` es 18 px + `p-1.5` ≈ 30 px, y los
`ZoomButton` son `size-11` (44 px).

**Arreglo:** `p-1` o un área táctil ampliada con pseudo-elemento. **Costo: S**

---

### A-13 · El contenedor de invitados es interactivo sin ser un control &nbsp;&nbsp; `[Bajo]` `[WCAG 2.1.1]`

**Dónde:** `src/components/AttendeesInput.tsx:76`.

**Qué pasa:** el `<div>` que agrupa los chips lleva `onClick` para enfocar el input, sin
manejador de teclado ni rol. **Son los 2 únicos avisos reales que quedan en el lint**
(`jsx-a11y/click-events-have-key-events` y `no-static-element-interactions`).

En la práctica el daño es pequeño —quien usa teclado llega al input directamente con Tab, y
esa comodidad de "clic en cualquier parte de la caja" es solo para el ratón—, pero deja el
lint con avisos permanentes, que es lo que impide subirlo a `error`.

**Arreglo:** `onMouseDown` en vez de `onClick` (es interacción de ratón por definición, y la
regla no lo marca), o `role="presentation"`. **Costo: S**

---

### A-14 · El borde del campo no llega a 3:1 &nbsp;&nbsp; `[Bajo]` `[WCAG 1.4.11]`

**Dónde:** `src/styles.css:164` (`.input`, `border-ink-300`).

**Qué pasa:** `ink-300` sobre blanco da **1.49:1**. Ese borde es lo único que delimita dónde
empieza y acaba un campo, así que le aplica el umbral de 3:1 de componentes no textuales.
Con poca luz o baja visión, el formulario se lee como texto suelto sobre blanco.

**Arreglo:** `ink-400` (2.64:1, sigue corto) o `ink-500` (4.79:1). **Costo: S**

---

### A-15 · El reloj se actualiza sin avisar &nbsp;&nbsp; `[Bajo]` `[WCAG 4.1.3]`

**Dónde:** `src/components/UpcomingRail.tsx:89-169`.

**Qué pasa:** `RollingNumber` remonta cada dígito por separado cada minuto
(`useNow()` tickea cada segundo). No hay `aria-live` —lo cual está bien, un reloj que se
anuncia solo sería insoportable— pero tampoco `role="timer"`, así que un lector que recorra
la zona puede leer los dígitos como fragmentos sueltos en vez de como una hora.

Lo mismo con la lista de la agenda: las tarjetas cambian de estado y entran/salen solas sin
que nada lo anuncie.

**Arreglo:** `role="timer"` con `aria-label` en el reloj y un `aria-live="polite"` discreto
para los cambios de estado de la agenda. **Costo: S**

---

## Bugs colaterales

No son de accesibilidad; salieron al leer el código.

**`RoomFormModal` tiene los campos Edificio y Piso duplicados.** Dos parejas de inputs, con
las mismas etiquetas y ligados al mismo estado (`building`, `floor`), con placeholders
distintos ("Ej. Oficina CDMX" / "Ej. Gerundio-HQ"). Escribir en uno cambia el otro. Es un
bloque pegado dos veces.

**Sigue ahí a propósito**: es un bug de UI, no de accesibilidad, y arreglarlo es decidir qué
pareja se queda. Pero conviene saber que el arreglo de A-03 lo dejó más a la vista: ahora
cada etiqueta apunta a su control con `htmlFor`, así que el formulario declara dos campos
distintos llamados "Edificio" y dos llamados "Piso". Antes el defecto era el mismo y se veía
menos.

**`AvailabilityBar` y `RoomCard` no están montados en ninguna pantalla.** No los importa
nadie. O se conectan o se borran: mientras tanto son código que se audita, se mantiene y no
sirve a ningún usuario.

---

## Lo que ya está bien

Para que nadie lo "arregle" al revés en la siguiente pasada:

- **`lang="es"`** en `__root.tsx:59`.
- **Movimiento reducido, respetado en los dos frentes**: `MotionConfig reducedMotion="user"`
  resuelto una sola vez en `__root.tsx:68`, y el bloque de `styles.css:463` para lo que vive
  en CSS. La animación de bienvenida directamente no existe con `prefers-reduced-motion`.
- **Nada del contenido principal depende de JS para hacerse visible** (`styles.css:264-273`).
  Es una decisión de rendimiento, pero también de accesibilidad: con el bundle caído o lento,
  el tablero se ve igual.
- **Los fondos decorativos están ocultos**: `LiquidBackground.tsx:306` y `WelcomeDrop.tsx:30`
  con `aria-hidden`.
- **`Avatar` tiene el contrato correcto**: `alt=""` cuando el nombre ya está escrito al lado,
  y `alt` real cuando la cara va sola — con el dato que el color no dice, "(organiza)",
  dentro del texto (`UpcomingRail.tsx:281`).
- **`GrndIcon` es decorativo por defecto** (`GrndIcon.tsx:101-103`), y los iconos de
  `lucide-react` se ponen `aria-hidden` solos cuando no llevan props de accesibilidad.
- **Todos los botones de solo icono tienen `aria-label`**: cerrar, editar, cancelar, zoom,
  cerrar sesión.
- **Existe un estilo de foco global**, y desde A-10 es de dos tonos, así que se ve sobre
  cualquier fondo de la app.
- **El login está bien estructurado**: `<main>` y `<h1>` (`login.tsx:46,57`).
- **Los badges y los botones sólidos cumplen contraste de sobra**: de 6.89:1 a 18.38:1.

---

## Matriz de contraste

Calculada sobre las rampas de `src/styles.css`. Umbral 4.5:1 para texto normal, 3:1 para
componentes no textuales; los marcados «—» son decoración pura, a la que 1.4.11 no aplica.
Las filas tachadas son las que el arreglo dejó sin uso.

Para volver a medir tras cambiar un color: el cálculo es el de WCAG 2.x (luminancia relativa
sobre las rampas de `styles.css`), y basta con recorrer los pares que la UI usa de verdad —
la lista de esta tabla — porque el problema nunca fue la rampa, sino en qué paso se apoya
cada texto.

| par | hex | ratio | exige | |
|---|---|---|---|---|
| `ink-950` / blanco | `#0b0c14` / `#ffffff` | 19.50 | 4.5 | OK |
| `ink-900` / blanco | `#16181d` / `#ffffff` | 17.76 | 4.5 | OK |
| `ink-800` / blanco | `#26282e` / `#ffffff` | 14.73 | 4.5 | OK |
| `ink-700` / blanco | `#3e4047` / `#ffffff` | 10.35 | 4.5 | OK |
| `ink-600` / blanco | `#51545c` / `#ffffff` | 7.57 | 4.5 | OK |
| `ink-500` / blanco | `#70727b` / `#ffffff` | 4.79 | 4.5 | OK |
| `ink-400` / blanco | `#9d9fa7` / `#ffffff` | 2.64 | 4.5 | ~~FALLA~~ → ya no lleva texto (A-06) |
| **`ink-300` / blanco** (borde de `.input`) | `#d1d4da` / `#ffffff` | **1.49** | 3 | **FALLA** (A-14) |
| `brand-500` / blanco | `#465fff` / `#ffffff` | 4.84 | 4.5 | OK |
| `brand-600` / blanco | `#2e3bd2` / `#ffffff` | 7.86 | 4.5 | OK |
| `aqua-800` / `aqua-100` (badge-libre) | `#003321` / `#deffee` | 13.14 | 4.5 | OK |
| `rosa-700` / `rosa-100` (badge-activa) | `#690048` / `#ffedf6` | 11.04 | 4.5 | OK |
| `brand-700` / `brand-100` (badge-reservada) | `#211fb4` / `#f1f5ff` | 10.02 | 4.5 | OK |
| `cielo-800` / `cielo-100` (badge-info) | `#002e30` / `#cbfcff` | 13.19 | 4.5 | OK |
| `amarillo-800` / `amarillo-100` (badge-aviso) | `#262e00` / `#f0ffc1` | 13.43 | 4.5 | OK |
| `ink-600` / `ink-100` (badge-neutral) | `#51545c` / `#f2f4fa` | 6.89 | 4.5 | OK |
| `rosa-700` / `rosa-50` (alert-error) | `#690048` / `#fff6fa` | 11.70 | 4.5 | OK |
| blanco / `brand-500` (btn-primary) | `#ffffff` / `#465fff` | 4.84 | 4.5 | OK |
| blanco / `brand-600` (btn-primary:hover) | `#ffffff` / `#2e3bd2` | 7.86 | 4.5 | OK |
| blanco / `rosa-600` (btn-danger) | `#ffffff` / `#87005d` | 9.60 | 4.5 | OK |
| blanco / `rosa-500` (btn-danger:hover) | `#ffffff` / `#b5007f` | 6.42 | 4.5 | OK |
| `rosa-600` / blanco (btn-danger-outline) | `#87005d` / `#ffffff` | 9.60 | 4.5 | OK |
| negro / `aqua-300` (chip-neon) | `#000000` / `#01ffb4` | 15.96 | 4.5 | OK |
| negro / `amarillo-200` (chip-neon) | `#000000` / `#ddff00` | 18.38 | 4.5 | OK |
| `rosa-600` / blanco (sala activa) | `#87005d` / `#ffffff` | 9.60 | 4.5 | OK |
| `brand-600` / blanco (sala reservada) | `#2e3bd2` / `#ffffff` | 7.86 | 4.5 | OK |
| `aqua-700` / blanco (sala libre) | `#004f35` / `#ffffff` | 9.68 | 4.5 | OK |
| `ink-200` / blanco (bordes de card) | `#e5e7ed` / `#ffffff` | 1.24 | — | decorativo |
| `ink-300` / blanco (borde-l finalizada) | `#d1d4da` / `#ffffff` | 1.49 | — | decorativo |
| **`aqua-100` / blanco** (fondo "libre") | `#deffee` / `#ffffff` | **1.07** | 3 | **FALLA** (A-09) |
| `rosa-400` / `aqua-100` (ocupado vs libre) | `#f425ae` / `#deffee` | 3.43 | 3 | OK |
| `brand-500` / blanco (foco sobre blanco) | `#465fff` / `#ffffff` | 4.84 | 3 | OK |
| ~~`brand-500` / `brand-500`~~ (foco viejo sobre btn-primary) | `#465fff` / `#465fff` | ~~1.00~~ | 3 | reemplazado (A-10) |
| `ink-950` / blanco (anillo de foco nuevo) | `#0b0c14` / `#ffffff` | 19.50 | 3 | OK |
| blanco / `brand-500` (halo del foco sobre btn-primary) | `#ffffff` / `#465fff` | 4.84 | 3 | OK |
| blanco / `brand-600` (halo del foco en hover) | `#ffffff` / `#2e3bd2` | 7.86 | 3 | OK |

---

## Backlog

Ordenado por daño, no por esfuerzo. Los siete primeros están hechos.

| # | Hallazgo | Costo | Estado |
|---|---|---|---|
| 1 | **A-01** Los modales no son diálogos | M | ✅ `A-01 · modales` (4 casos) |
| 2 | **A-02** Los campos de hora se anuncian igual | S | ✅ `A-02 · …` |
| 3 | **A-03** El campo de invitados se queda sin nombre | S | ✅ `A-03 · …` (2 casos) |
| 4 | **A-04** Los errores no se anuncian | S | ✅ `A-04 · …` |
| 5 | **A-06** `text-ink-400` no alcanza contraste | S | ✅ no queda ni un uso |
| 6 | **A-08** Nombre de la sala ilegible | S | ✅ `A-08 · sala del mapa` |
| 7 | **A-10** Foco invisible sobre botones de marca | S | ✅ anillo de dos tonos |
| 8 | **A-07** Sin `<main>`, sin `<h1>`, asides sin nombre | M | abierto · `A-07 · …` (2, en `skip`) |
| 9 | **A-12** Botón de quitar invitado de 12 px | S | abierto |
| 10 | **A-14** Borde de campo por debajo de 3:1 | S | abierto |
| 11 | **A-11** Botones que no hacen nada | S/M | abierto |
| 12 | **A-13** Contenedor de invitados interactivo | S | abierto · son los 2 avisos de `pnpm lint` |
| 13 | **A-15** Reloj sin `role="timer"` | S | abierto |
| 14 | **A-09** Información solo en `title` | M | abierto |
| 15 | **A-05** Reflow al 200 % | L | abierto · **el único alto que queda** |

Estado de las herramientas tras la primera tanda: `pnpm test` en verde con 39 casos y 2
`skip` (los dos de A-07); `pnpm lint` en verde con 2 avisos, los dos de A-13; `tsc --noEmit`
limpio.

Los que quedan se agrupan bien en tres tandas: **A-07 + A-11** son la estructura de la
página (landmarks, encabezados, enlace de salto y qué hacer con los ocho botones que no
hacen nada — probablemente la misma decisión de producto). **A-12 + A-13 + A-14 + A-15** son
cuatro retoques sueltos, y el de A-13 es el que deja `pnpm lint` a cero. **A-05 + A-09** son
los de verdad: el reflow toca el diseño visible, y A-09 pide decidir cómo se dice sin `title`
lo que hoy solo aparece al posar el ratón.

**Cuando el backlog llegue a cero:** subir las reglas de `eslint.config.js` a `error` y
quitar los `.skip` de `a11y.test.tsx`. A partir de ahí, la regresión no compila.
