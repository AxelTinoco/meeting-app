/* La marca que el callback de OAuth deja en la URL para decir "esta carga viene de
   iniciar sesión". Es lo único que separa entrar de recargar, y de ella depende que
   se vea la animación de bienvenida (ver `WelcomeDrop`).

   Vive aquí, y no suelta en la ruta, porque tiene dos trampas del router que hay que
   cumplir a la vez. Las dos fallan en silencio: sin excepción, sin warning, sin
   animación.

     1. TanStack pasa cada valor del querystring por `JSON.parse` antes de que
        `validateSearch` lo vea. Con `bienvenida=1` lo que llega es el número 1, y con
        `bienvenida=true` un booleano. Por eso el valor es una palabra: "si" no es JSON
        válido y sobrevive intacto. Es la misma razón por la que `?fondo=humo` y
        `?error=dominio` usan palabras.

     2. Lo que devuelve `validateSearch` tiene que volver a serializarse EXACTAMENTE
        igual que entró. El router compara la URL con la que sale de validar y, si
        difieren, redirige a la forma canónica. Devolver `true` a partir de "si" salía
        como un 307 a `/` antes de renderizar nada.

   `welcome.test.ts` fija las dos con el parser y el serializador reales del router. */

export const WELCOME_PARAM = 'bienvenida'
export const WELCOME_VALUE = 'si'

export interface WelcomeSearch {
  bienvenida?: typeof WELCOME_VALUE
}

/** `validateSearch` del tablero: conserva el valor tal cual o lo quita. Nunca lo normaliza. */
export function validateWelcome(search: Record<string, unknown>): WelcomeSearch {
  return {
    bienvenida: search.bienvenida === WELCOME_VALUE ? WELCOME_VALUE : undefined,
  }
}
