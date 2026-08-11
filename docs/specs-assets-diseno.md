# Specs de assets para el equipo de diseño

**Proyecto:** Gerundio · Salas (app web de reservación de salas)
**Contexto técnico:** React + Tailwind v4, se despliega en Cloudflare Workers.
La paleta y las reglas de contraste están en [`design-system.md`](./design-system.md).

Este documento es lo que necesitamos recibir. Está dividido en cuatro entregables
independientes: se pueden entregar por separado y en ese orden de prioridad.

---

## 0. Reglas que aplican a todo

| Regla                | Especificación                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Nombres de archivo   | `kebab-case`, sin acentos, sin ñ, sin espacios. Ej. `disenando.svg`, no `diseñando.svg`         |
| Un concepto          | Un archivo por icono/avatar. Nada de sprites ni de varios iconos en un mismo lienzo             |
| Sin texto embebido   | La UI es multilingüe a futuro; el texto va en HTML, nunca dentro del asset                      |
| Espacio de color     | sRGB                                                                                            |
| Contraste mínimo     | **3:1** para iconos y elementos gráficos, **4.5:1** para texto (WCAG 2.1 AA)                    |
| Colores permitidos   | Solo la paleta de marca: `brand`, `rosa`, `aqua`, `cielo`, `amarillo`, `ink`. Ningún otro matiz |

### La trampa del neón (importante)

Cuatro colores de la marca son neón y **no alcanzan contraste como tinta sobre blanco**:

| Color         | Hex       | Sobre blanco | Con negro encima | Uso válido                    |
| ------------- | --------- | ------------ | ---------------- | ----------------------------- |
| Amarillo      | `#DDFF00` | **1.14:1** ❌ | 18.38:1 ✅       | Solo fondo                    |
| Azul claro    | `#7AF7FF` | **1.27:1** ❌ | 16.58:1 ✅       | Solo fondo                    |
| Aqua          | `#01FFB4` | **1.32:1** ❌ | 15.96:1 ✅       | Solo fondo                    |
| Rosa          | `#F425AE` | **3.67:1** ⚠️ | 5.72:1 ✅        | Fondo; icono grande, no texto |
| Azul Gerundio | `#465FFF` | **4.84:1** ✅ | 4.34:1 ✅        | Icono y texto                 |

Traducción práctica: **no entreguen iconos coloreados en aqua, amarillo o azul claro
sobre fondo blanco.** Sobre esos colores como fondo, el contenido va en **negro**
(negro sobre aqua da 15.96:1, sobre amarillo 18.38:1).

---

## 1. Iconos de marca — los "gerundios" (prioridad alta)

Ya existen 48 en `public/icons/grnd/`, extraídos de un export de Google Slides. Se pintan
como **máscara CSS**: la app les inyecta el color con `currentColor`, así que el archivo
aporta solo la *forma*.

**Qué necesitamos de ustedes:** los mismos 48 (más los nuevos que hagan falta) como **SVG**,
más los que agreguen a futuro.

| Spec                | Valor                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Formato             | **SVG** (hoy son PNG raster; el SVG nos da nitidez a cualquier tamaño y menos peso)          |
| Lienzo (`viewBox`)  | `0 0 48 48`, cuadrado exacto                                                                |
| Área de contenido   | El dibujo ocupa el **87.5%** del lienzo (42 de 48 px), centrado óptico. Margen de 3px por lado |
| Color               | **Monocromo puro.** Un solo `fill`, negro `#000000`. Sin degradados, sin colores, sin opacidades parciales |
| Trazos              | **Expandidos a formas** (`Outline stroke` / `Contornear trazo`). Un `stroke` sin expandir no funciona como máscara |
| Grosor mínimo       | ≥ 1.5px medidos en el lienzo de 48 → sigue visible cuando se renderiza a 16px                |
| Detalle             | El icono debe leerse **a 16px**. Si a ese tamaño se convierte en una manchita, simplifíquenlo |
| Prohibido           | Máscaras, `clip-path`, filtros, texto sin convertir a curvas, elementos fuera del `viewBox`  |

### Por qué monocromo y no color

La app usa el mismo icono en cinco contextos con colores distintos: blanco sobre azul (nav
activa), gris sobre blanco (nav inactiva), azul sobre lavanda, negro sobre neón. Un icono
monocromo hereda el color del contexto automáticamente y siempre cumple contraste. Uno con
color embebido rompería en al menos tres de esos cinco casos.

### Tamaños de render reales (para que validen la legibilidad)

Los iconos se dibujan en la UI a: **12, 13, 14, 15, 16, 18 y 20 px**. El más común es 18px.
El logo del sidebar usa uno a 20px dentro de un cuadro de 40px.
Validen cada icono a **16px** en pantalla, no al 100% del artboard.

---

## 2. Avatares de usuario (prioridad alta)

Hoy **no hay imágenes**: el sidebar muestra las iniciales del usuario en un círculo gris.
Cuando conectemos el login de Google llegará la foto de perfil de cada persona, pero seguirá
habiendo gente sin foto.

**Qué necesitamos de ustedes, en este orden:**

### 2.1 El fallback de iniciales (lo más importante)

No es una imagen, es una spec de estilo. Necesitamos que definan:

- Color de fondo del círculo y color de las iniciales, **cumpliendo 4.5:1** entre ambos.
  Hoy es `ink-300` con texto `ink-600`; si quieren algo más de marca, denos el par exacto.
- ¿Un color fijo para todos, o color derivado del nombre (una paleta de 4–6 tintes de marca
  que rote por usuario)? Si es lo segundo, denos la lista de pares fondo/texto ya validados.
- Tipografía, peso y tamaño relativo de las iniciales dentro del círculo.

### 2.2 Avatar genérico (para invitados externos y salas sin dueño)

| Spec           | Valor                                                                        |
| -------------- | ---------------------------------------------------------------------------- |
| Formato        | SVG monocromo, mismas reglas que la sección 1                                |
| Lienzo         | `0 0 48 48`                                                                  |
| Nota           | Ya tenemos `user-persona` en el set de gerundios; quizá con ese basta         |

### 2.3 Si van a entregar fotos reales (equipo interno)

| Spec                | Valor                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Formato             | **WebP** (calidad 82) con **JPG** de respaldo                                             |
| Dimensiones         | **Cuadradas.** Entregar a `144×144` (cubre el render de 36px hasta @4x)                     |
| Recorte             | **No recortar en círculo.** Entregar el cuadrado completo; el CSS aplica el `border-radius` |
| Encuadre            | Cabeza y hombros. El rostro dentro del **80% central** del cuadro: al recortarse en círculo se pierden las esquinas |
| Fondo               | Sólido o desenfocado uniforme. Nada de fondos que compitan con la UI                       |
| Peso máximo         | **20 KB** por avatar                                                                       |
| Nombre              | `avatar-nombre-apellido.webp`                                                              |

**Detalle de contraste:** una foto con fondo claro sobre el fondo blanco de la app "flota"
sin borde. Ya lo resolvemos con un borde de 1px en `ink-200`, no necesitan simularlo en la imagen.

---

## 3. Iconos funcionales de interfaz (prioridad baja)

Flechas, cerrar, chevrons, calendario, reloj, etc. **Ya están resueltos**: usamos
[Lucide](https://lucide.dev), que trae ~1500 iconos consistentes, y no vale la pena
redibujarlos.

Solo los necesitamos de ustedes si quieren un icono que Lucide no tenga o si un gerundio
lo sustituye mejor. En ese caso, las specs de Lucide para que no se note el salto:

| Spec         | Valor                                    |
| ------------ | ---------------------------------------- |
| Lienzo       | `0 0 24 24`                              |
| Estilo       | Trazo, **no** relleno                    |
| Grosor       | `stroke-width: 2`                        |
| Terminaciones| `stroke-linecap: round`, `linejoin: round` |
| Color        | `stroke: currentColor`, sin `fill`       |

Ojo: estos **sí** conservan el `stroke` sin expandir (al contrario de los gerundios de la
sección 1, que van como máscara). Son dos pipelines distintos.

---

## 4. Icono de aplicación, favicon y PWA (prioridad media)

Esto está pendiente de verdad: `public/manifest.json` y `public/logo*.png` siguen siendo los
archivos de ejemplo de la plantilla con la que se armó el proyecto ("TanStack App").

| Archivo               | Tamaño    | Formato | Notas                                                                 |
| --------------------- | --------- | ------- | --------------------------------------------------------------------- |
| Logo maestro          | vectorial | SVG     | El logo de Gerundio · Salas, capas editables                          |
| `favicon.svg`         | `32×32` nominal | SVG | Versión simplificada: a 16px un logo completo no se lee               |
| `favicon.ico`         | 16/32/48 multi | ICO | Para navegadores viejos                                               |
| `logo192.png`         | `192×192` | PNG     | Icono de app                                                          |
| `logo512.png`         | `512×512` | PNG     | Icono de app, alta resolución                                         |
| `logo-maskable.png`   | `512×512` | PNG     | **Safe area:** el contenido dentro del círculo central de 409px de diámetro (80%). Android recorta el resto |
| `apple-touch-icon.png`| `180×180` | PNG     | Sin transparencia (iOS la pinta en negro): fondo sólido               |

Colores del manifest, para que coincidan con la marca:
`theme_color: #465FFF` (azul Gerundio) y `background_color: #FFFFFF`.

---

## 5. Formato de entrega

- Carpeta o Drive con la estructura: `iconos-marca/`, `avatares/`, `app-icons/`.
- **Los fuentes también** (Figma o AI), no solo los exports: cuando haya que agregar un icono
  necesitamos partir del original.
- Un `README` corto o un mensaje con lo que cambió respecto a la entrega anterior.

## 6. Checklist de aceptación

Antes de darlo por bueno revisamos:

- [ ] Todo SVG abre con un solo `fill` negro y sin `stroke` sin expandir (secciones 1 y 2.2)
- [ ] Cada icono es legible a 16px
- [ ] Los nombres son `kebab-case` sin acentos ni ñ
- [ ] Ningún asset trae colores fuera de la paleta de marca
- [ ] Ningún icono depende de aqua, amarillo o azul claro para distinguirse sobre blanco
- [ ] Los avatares son cuadrados, sin recorte circular, ≤20 KB
- [ ] El icono maskable respeta el círculo seguro del 80%
