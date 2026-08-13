import { describe, expect, it } from 'vitest'
import { safeInternalPath, withSearchParam } from './http'

/*
 * `withSearchParam` usa `URL` con una base ficticia solo para poder trabajar con una
 * ruta relativa. Si alguien devuelve `url.href` en vez de recomponer la ruta a mano, el
 * redirect del login se vuelve absoluto y apunta a un host inventado.
 *
 * Lo que le pasa al valor una vez está en la URL se prueba en `welcome.test.ts`.
 */

describe('withSearchParam', () => {
  it('nunca devuelve un destino absoluto', () => {
    expect(withSearchParam('/', 'bienvenida', 'si')).toBe('/?bienvenida=si')
  })

  it('conserva los parámetros que ya traía la ruta', () => {
    expect(withSearchParam('/?fondo=humo', 'bienvenida', 'si')).toBe(
      '/?fondo=humo&bienvenida=si',
    )
  })

  it('respeta el hash', () => {
    expect(withSearchParam('/sala#pecera', 'bienvenida', 'si')).toBe(
      '/sala?bienvenida=si#pecera',
    )
  })

  it('sigue siendo una ruta interna que safeInternalPath acepta', () => {
    const destino = withSearchParam(safeInternalPath('/'), 'bienvenida', 'si')
    expect(safeInternalPath(destino)).toBe(destino)
  })
})

