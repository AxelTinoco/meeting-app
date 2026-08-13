import { describe, expect, it } from 'vitest'
import { defaultParseSearch, defaultStringifySearch } from '@tanstack/react-router'
import { WELCOME_PARAM, WELCOME_VALUE, validateWelcome } from './welcome'
import { withSearchParam } from './http'

/*
 * La marca de bienvenida cruza el router entero: el callback la escribe en un 302, el
 * router la parsea, `validateWelcome` la valida y el router vuelve a serializarla para
 * comprobar que la URL es canónica. Si cualquiera de esos pasos la altera, el tablero
 * no se entera de que vienes de iniciar sesión y no pasa nada — sin excepción ni
 * warning que lo delate. Las dos formas de romperlo ya ocurrieron:
 *
 *   · devolver `true` en vez de "si"  → 307 a `/`, la ruta ni se renderiza
 *   · usar `=1` como valor            → llega el número 1 y la comparación falla
 *
 * Por eso aquí se usan `defaultParseSearch`/`defaultStringifySearch` de verdad y no
 * un doble: lo que se está fijando es el comportamiento del router, no el nuestro.
 */

/** El viaje completo, tal como lo hace el router con la URL del callback. */
function through(path: string) {
  const search = defaultParseSearch(new URL(path, 'http://interno.local').search)
  const validated = validateWelcome(search)
  return { validated, canonical: defaultStringifySearch(validated) }
}

const DESDE_EL_CALLBACK = withSearchParam('/', WELCOME_PARAM, WELCOME_VALUE)

describe('la marca de bienvenida', () => {
  it('sale del callback como ?bienvenida=si', () => {
    expect(DESDE_EL_CALLBACK).toBe('/?bienvenida=si')
  })

  it('sobrevive al viaje de ida y vuelta por el router', () => {
    const { validated, canonical } = through(DESDE_EL_CALLBACK)
    expect(validated.bienvenida).toBe(WELCOME_VALUE)
    // Idéntico a lo que entró: si difiriera, el router redirigiría para normalizar y
    // se perdería la marca antes de renderizar.
    expect(canonical).toBe('?bienvenida=si')
  })

  it('no se activa sin marca, y esa URL también es canónica', () => {
    const { validated, canonical } = through('/')
    expect(validated.bienvenida).toBeUndefined()
    expect(canonical).toBe('')
  })

  it('ignora valores que no son exactamente "si"', () => {
    for (const url of ['/?bienvenida=1', '/?bienvenida=true', '/?bienvenida=no']) {
      expect(through(url).validated.bienvenida).toBeUndefined()
    }
  })

  it('demuestra por qué el valor no puede ser 1 ni true: JSON.parse se los come', () => {
    const parse = (q: string) => defaultParseSearch(q) as Record<string, unknown>
    expect(parse('?bienvenida=1').bienvenida).toBe(1)
    expect(parse('?bienvenida=true').bienvenida).toBe(true)
    expect(parse('?bienvenida=si').bienvenida).toBe('si')
  })
})
