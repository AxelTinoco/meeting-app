# Login y roles

## Cómo entra la gente

Login con Google restringido a `@gerundio.com.mx`. OAuth se usa **solo para identidad**
(scopes `openid email profile`): las llamadas a Calendar siguen yendo por la service
account, impersonando al correo de la sesión. Por eso no se guardan tokens de Google de
cada usuario, solo su nombre y correo en una cookie sellada.

La puerta del dominio es el claim `hd` del `id_token`. El parámetro `hd=` de la URL de
Google es solo una pista para el selector de cuentas y el usuario puede borrarlo; lo que
de verdad rechaza una cuenta ajena es la validación del token en
`src/lib/google/oauth.ts`.

Piezas:

| Archivo | Qué hace |
| --- | --- |
| `src/routes/api/auth/login.ts` | Manda a Google con `state` y `nonce` guardados en una cookie de 10 min |
| `src/routes/api/auth/callback.ts` | Valida el `state`, cambia el code por el `id_token` y abre sesión |
| `src/routes/api/auth/logout.ts` | Cierra sesión (solo POST) |
| `src/lib/session.ts` | Cookie de sesión sellada (7 días) |
| `src/lib/auth.ts` | `getCurrentUser` / `requireUser` / `requireAdmin` |
| `src/routes/__root.tsx` | `beforeLoad` que redirige a `/login` si no hay sesión |

## Configuración

En `.dev.vars` (dev) y `wrangler secret put` (prod):

```
GOOGLE_OAUTH_CLIENT_ID=…
GOOGLE_OAUTH_CLIENT_SECRET=…
SESSION_SECRET=…            # openssl rand -base64 48 · distinto en dev y prod
```

En Google Cloud Console → *Credentials* → el OAuth client de tipo **Web**, hay que dar de
alta como **Authorized redirect URI** exactamente la URL a la que llega el navegador:

- `http://localhost:3000/api/auth/callback` (dev; si Vite arranca en otro puerto, hay que
  registrar ese puerto o liberar el 3000)
- `https://<dominio-de-producción>/api/auth/callback`

Si no está registrada, Google responde `redirect_uri_mismatch` antes de mostrar el
selector de cuentas.

## Roles

Dos roles, definidos en `src/lib/roles.config.ts`:

- **admin** — gestiona salas y puede editar o cancelar reservas de cualquiera.
- **miembro** — reserva, y gestiona solo lo suyo. Es el rol de cualquiera del dominio.

Para hacer admin a alguien, agrega su correo a `ADMIN_EMAILS` y despliega. El rol **no**
se guarda en la cookie: se calcula en cada petición, así que quitarlo surte efecto sin
esperar a que caduque la sesión.

Si algún día conviene que IT lo administre desde la Admin Console, el reemplazo natural es
un grupo de Workspace (`salas-admins@gerundio.com.mx`) leído con la misma service account
(scope extra `admin.directory.group.readonly`); `roleFor()` es el único punto a cambiar.

### Quién puede tocar qué

| Acción | Quién |
| --- | --- |
| Ver el mapa y reservar | Cualquiera del dominio |
| Editar / cancelar una reserva | Su dueño, o un admin |
| Alta / edición / baja de salas | Solo admin (hoy además lanza: es Admin Console) |

Las reglas se aplican en las server functions (`src/server/`), que es lo que cuenta; la UI
usa las mismas de `src/lib/permissions.ts` solo para no pintar botones que van a fallar.

Cuando un admin edita o cancela la reserva de alguien más, la acción se ejecuta
impersonando al **organizador original**, no al admin: así el evento se cancela de verdad
para todos los invitados en vez de solo quitar la copia de la sala.

## Gestión de salas

El CRUD de salas de la UI existe pero lanza: dar de alta un recurso de calendario es Admin
Directory API, que sigue pendiente. Mientras tanto las 3 salas se administran en la Admin
Console y viven en `src/lib/rooms.config.ts`.
