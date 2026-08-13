# Solicitud de acceso — App de reservación de salas

**Para:** administrador de Google Workspace de Gerundio
**De:** Axel
**Tiempo estimado de tu parte:** ~5 minutos

---

## ¿Qué es esto?

Estoy construyendo una app interna para que el equipo vea qué salas están libres y las
reserve, conectada a Google Calendar. Ya hice todo lo que se podía hacer sin ser Súper
administrador:

- Las 3 salas están dadas de alta como recursos de calendario en el edificio Gerundio-HQ
  (El Taller, La pecera, Salita Azul).
- La cuenta de servicio que usará la app ya existe en Google Cloud
  (`salas-app@sala-juntas-504623.iam.gserviceaccount.com`).

**Falta un solo paso, y ese sí exige el rol de Súper administrador.** Elige la opción que
te sea más cómoda: la A te toma 2 minutos y no me das ningún acceso.

---

## Opción A (recomendada): haz tú el único paso que falta

1. Entra a **https://admin.google.com/ac/owl/domainwidedelegation**
   (Seguridad → Control de acceso y datos → Controles de API → *Administrar delegación en
   todo el dominio*).
2. Clic en **Añadir nueva**.
3. Llena los dos campos exactamente así:

   **ID de cliente:**
   ```
   116613007207476438004
   ```

   **Ámbitos de OAuth** (los dos, separados por coma, sin espacios):
   ```
   https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/calendar.readonly
   ```
4. Clic en **Autorizar**. Avísame y yo sigo (tarda unos minutos en activarse).

Esos dos permisos dejan que la app lea disponibilidad y cree/borre **eventos de calendario**.
No dan acceso a correo, archivos, contraseñas ni a ningún otro dato del equipo.

### Permiso extra: fotos de perfil del equipo (opcional)

Para que en las reservas se vea la **cara** de cada invitado en vez de sus iniciales, hace
falta un tercer ámbito:

```
https://www.googleapis.com/auth/directory.readonly
```

Es de **solo lectura del directorio de la empresa** — los mismos nombres, correos y fotos
que cualquiera del equipo ya ve al escribir un invitado en Google Calendar. No da acceso a
crear, editar ni borrar usuarios.

Va **en la misma entrada** que los dos de Calendar (la del cliente `sala-juntas`), no en
una nueva: la consola indexa las entradas por ID de cliente y no admite dos con el mismo.
Pasos: en la fila del cliente → *Editar* → en el campo vacío de **Permisos de OAuth** se
pega el ámbito → **Autorizar**. Ojo: **no borrar las filas de Calendar** que ya están, o la
app deja de poder leer y crear eventos.

Que estén en la misma entrada no le quita el aislamiento: esta lista es solo el permiso
máximo que la app *puede* pedir. En el código los ámbitos van en dos grupos (`CALENDAR_SCOPES`
y `DIRECTORY_SCOPES`) y cada token pide el suyo, así que si el del directorio falla, lo
único que se pierde son las fotos.

Además hay que **habilitar la People API** en el proyecto de Google Cloud
`sala-juntas-504623` (Cloud Console → APIs y servicios → Habilitar APIs → *People API*).
Eso no necesita Súper administrador.

---

## Opción B: dame Súper administrador temporalmente

Si prefieres no hacerlo tú, asígname el rol y yo ejecuto el paso de arriba. Cuando termine
(mismo día) **puedes quitármelo**: la app sigue funcionando porque la autorización ya
quedó creada.

### Lo que necesito que hagas

Asignarme el rol de **Súper administrador** a mi cuenta:

**axel@gerundio.com.mx**  ← (cambia esto por el correo correcto)

### Pasos exactos

1. Entra a **https://admin.google.com** con tu cuenta de administrador.
2. En el menú de la izquierda, ve a **Directorio → Usuarios**.
   (o abre directo: https://admin.google.com/ac/users)
3. Busca y haz clic en mi usuario: **axel@gerundio.com.mx**.
4. En la página de mi usuario, haz clic en la tarjeta que dice
   **"Roles y privilegios de administrador"**.
5. Haz clic en **"Asignar roles"** (o el lápiz de editar).
6. Activa el interruptor de **"Súper administrador"**.
7. Haz clic en **"Guardar"**.

Con eso me llega el acceso (a veces tarda unos minutos en activarse). Avísame y yo sigo.

---

## Preguntas que quizá tengas

**¿Es seguro darme Súper administrador?**
Sí, y es temporal. Lo necesito solo para crear la conexión con Calendar. En cuanto termine
me lo puedes quitar (mismos pasos de arriba, pero apagando el interruptor). La app seguirá
funcionando porque la conexión ya habrá quedado creada.

**¿Puedo dártelo solo para las salas, no completo?**
Una parte de la configuración (autorizar el acceso de la app a los calendarios de todo el
dominio) **exige** el rol de Súper administrador; no existe un permiso más chico para eso.
Por eso pido el rol completo, pero temporal.

**¿Prefieres hacerlo tú en vez de darme acceso?**
Sí: es la **Opción A** de arriba, son 2 minutos y no me das ningún acceso.

**¿Esto puede romper o borrar algo?**
No. Autorizar la delegación no modifica correos, eventos existentes ni datos del equipo:
solo permite que la app cree y consulte eventos en los calendarios de las salas.
