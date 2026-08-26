// Envío del aviso al webhook del workflow de Slack (Workflow Builder).
//
// Por qué un webhook y no una app con bot token: instalar una app en el workspace exige la
// aprobación de un *owner*, y aquí no la tenemos. Un trigger de webhook lo crea cualquiera
// con Workflow Builder y no pasa por esa puerta.
//
// El precio está en `message.ts`: un trigger solo acepta variables PLANAS (texto, usuario,
// canal) y no admite JSON anidado, así que no se puede mandar Block Kit. Todo el mensaje
// viaja en una sola variable de texto y el workflow lo publica tal cual.

import { getSlackWebhookUrl } from '../env'

/**
 * Nombres de las variables que espera el workflow.
 *
 * Tienen que coincidir EXACTAMENTE con las claves dadas de alta en el paso "Desde un
 * webhook". Si `text` no coincide, Slack acepta la petición con 200 y descarta el dato: el
 * workflow corre y publica un mensaje vacío, sin error que lo delate.
 *
 * `id_user` es de tipo "Usuario de Slack" e insertada en el mensaje con la opción de
 * pantalla "@nombre de Slack". Es la ÚNICA forma de mencionar de verdad: un `<@U123>`
 * escrito dentro de la variable de texto sale literal, porque Workflow Builder lo escapa.
 */
const TEXT_VARIABLE = 'text'
const USER_VARIABLE = 'id_user'

/** Manda un payload al trigger. Lanza si Slack lo rechaza. */
async function post(
  url: string,
  payload: Record<string, string>,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`Slack webhook falló (${res.status}): ${await res.text()}`)
  }

  // Igual que el resto de la Web API, un trigger puede contestar 200 con `ok: false`
  // (workflow desactivado, borrado o sin permisos sobre el canal).
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean
    error?: string
  } | null

  if (data && data.ok === false) {
    throw new Error(`Slack webhook rechazó el aviso: ${data.error}`)
  }
}

export interface WebhookMessage {
  /** El mensaje completo en mrkdwn. */
  text: string
  /**
   * Correos de a quién mencionar, del más deseable al más seguro. Se usa el primero que
   * Slack reconozca.
   */
  mentionCandidates: Array<string>
}

/**
 * Publica el aviso, mencionando al primer candidato que Slack reconozca.
 *
 * Los reintentos no son paranoia: `id_user` es OBLIGATORIA y un correo que Slack no
 * resuelva hace que el trigger conteste 400 SIN PUBLICAR NADA — ni siquiera el texto
 * (comprobado el 2026-08-26). No hay forma de publicar sin mención por este workflow, así
 * que la única red posible es proponer a otra persona.
 *
 * De ahí el orden que arma `notify.ts`: primero el organizador, que es a quien le sirve el
 * aviso, y luego quien ejecutó la acción. El segundo casi nunca falla porque siempre es un
 * humano con sesión abierta en la app; el primero puede ser una SALA en las reservas
 * anteriores al 2026-08-11 (ver `permissions.ts`), y una sala no tiene cuenta de Slack.
 */
export async function postToWebhook(message: WebhookMessage): Promise<void> {
  const url = getSlackWebhookUrl()

  // Duplicados fuera: en una junta normal el organizador y quien opera son la misma
  // persona, y no tiene caso gastar dos intentos idénticos.
  const candidates = [
    ...new Set(message.mentionCandidates.map((e) => e.trim()).filter(Boolean)),
  ]

  let lastError: unknown

  for (const email of candidates) {
    try {
      await post(url, {
        [TEXT_VARIABLE]: message.text,
        [USER_VARIABLE]: email,
      })
      return
    } catch (error) {
      lastError = error
    }
  }

  // Sin candidatos válidos no hay aviso posible. Se propaga para que quede en el log de
  // `notify.ts`: es raro y conviene enterarse, aunque la reserva ya haya quedado bien.
  throw new Error(
    `Slack: ningún involucrado se pudo mencionar (${candidates.join(', ') || 'sin candidatos'}). Último error: ${String(lastError)}`,
  )
}
