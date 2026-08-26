import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postToWebhook } from './webhook'

const URL_TRIGGER = 'https://hooks.slack.com/triggers/T1/1/abc'

/** Los `id_user` con los que se intentó, en orden. */
function mentionedEmails(fetchMock: ReturnType<typeof vi.fn>): Array<string> {
  return fetchMock.mock.calls.map(
    (call) => JSON.parse(String((call[1] as RequestInit).body)).id_user,
  )
}

describe('postToWebhook', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = URL_TRIGGER
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.SLACK_WEBHOOK_URL
  })

  const ok = () => new Response('{"ok":true}', { status: 200 })
  /** Lo que contesta el trigger cuando `id_user` no es nadie que Slack conozca. */
  const rechazado = () =>
    new Response('{"ok":false,"error":"invalid_workflow_input"}', {
      status: 400,
    })

  it('menciona al primer candidato y no intenta con los demás', async () => {
    fetchMock.mockResolvedValue(ok())

    await postToWebhook({
      text: 'hola',
      mentionCandidates: ['ivonne@gerundio.com.mx', 'axel@gerundio.com.mx'],
    })

    expect(mentionedEmails(fetchMock)).toEqual(['ivonne@gerundio.com.mx'])
    expect(
      JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)).text,
    ).toBe('hola')
  })

  it('cae al siguiente cuando Slack no reconoce al primero', async () => {
    // El caso real: una reserva vieja donde la SALA figura como organizadora.
    fetchMock.mockResolvedValueOnce(rechazado()).mockResolvedValueOnce(ok())

    await postToWebhook({
      text: 'hola',
      mentionCandidates: ['pecera@gerundio.com.mx', 'axel@gerundio.com.mx'],
    })

    expect(mentionedEmails(fetchMock)).toEqual([
      'pecera@gerundio.com.mx',
      'axel@gerundio.com.mx',
    ])
  })

  it('no gasta dos intentos en la misma persona', async () => {
    // Lo normal: quien reserva es el organizador, así que los dos candidatos coinciden.
    fetchMock.mockResolvedValue(ok())

    await postToWebhook({
      text: 'hola',
      mentionCandidates: ['axel@gerundio.com.mx', ' axel@gerundio.com.mx '],
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('lanza si ningún candidato sirve', async () => {
    // Tiene que propagarse: `notify.ts` es quien decide tragárselo, no este módulo.
    fetchMock.mockResolvedValue(rechazado())

    await expect(
      postToWebhook({
        text: 'hola',
        mentionCandidates: ['sala@gerundio.com.mx'],
      }),
    ).rejects.toThrow(/ningún involucrado/)
  })
})
