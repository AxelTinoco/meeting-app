# Solicitud de acceso — App de reservación de salas

**Para:** administrador de Google Workspace de Gerundio
**De:** Axel
**Tiempo estimado de tu parte:** ~5 minutos

---

## ¿Qué es esto?

Estoy construyendo una app interna para que el equipo vea qué salas están libres y las
reserve, conectada a Google Calendar. Para conectarla necesito hacer una configuración
técnica en las consolas de Google, pero **esa configuración solo la puede hacer un
administrador del Workspace**.

En lugar de pedirte que hagas los pasos técnicos (son varios y detallados), lo más simple
es que **me des acceso de administrador temporalmente** y yo hago toda la configuración.
Cuando termine (mismo día), **puedes quitarme el acceso** sin problema: la app sigue
funcionando.

---

## Lo único que necesito que hagas

Asignarme el rol de **Súper administrador** a mi cuenta:

**axel@gerundio.mx**  ← (cambia esto por el correo correcto)

### Pasos exactos

1. Entra a **https://admin.google.com** con tu cuenta de administrador.
2. En el menú de la izquierda, ve a **Directorio → Usuarios**.
   (o abre directo: https://admin.google.com/ac/users)
3. Busca y haz clic en mi usuario: **axel@gerundio.mx**.
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
También se puede: en ese caso yo te paso la guía técnica paso a paso y tú la ejecutas
conmigo en una llamada de ~15 min. Solo dime y te la mando.

---

## Qué haré yo una vez con acceso (referencia, no necesitas hacerlo)

1. Dar de alta las salas físicas como *recursos de calendario*.
2. Crear una *cuenta de servicio* en Google Cloud con *delegación en todo el dominio*.
3. Autorizar esa cuenta con permisos de solo lectura/eventos de Calendar.

Nada de esto borra ni modifica correos, eventos existentes ni datos del equipo.
