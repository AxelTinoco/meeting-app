//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import jsxA11y from 'eslint-plugin-jsx-a11y'

export default [
  ...tanstackConfig,
  // Accesibilidad. Las reglas van en `warn` y no en `error` a propósito: la
  // auditoría (ver `docs/accesibilidad.md`) dejó la lista de infracciones del
  // baseline abierta, y `pnpm lint` tiene que seguir en verde mientras se decide
  // qué se arregla. Cuando la lista quede en cero, subir esto a `error` es lo que
  // impide que vuelvan a entrar.
  {
    ...jsxA11y.flatConfigs.recommended,
    files: ['src/**/*.{jsx,tsx}'],
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [
          rule,
          'warn',
        ]),
      ),

      // Las tres de abajo se apagan porque en ESTE código dan falsos positivos
      // en bloque, y una regla que grita 15 veces sin razón enseña a ignorar el
      // lint entero. El motivo está medido, no supuesto (ver A-11 en la auditoría).

      // Deprecada por el propio plugin y más estricta que la norma: exige que el
      // label tenga anidamiento *y* `htmlFor`. Anidar el control ya es asociación
      // válida. `label-has-associated-control`, que sí es la vigente, sigue activa.
      'jsx-a11y/label-has-for': 'off',

      // Los campos de los modales envuelven su control con `<Field>`, que recibe
      // el control por `children`: la regla es estática, no puede seguir esa
      // indirección y marca los 12 inputs como si no tuvieran etiqueta. El caso
      // que sí es real (`AttendeesInput` dentro de un label con varios controles)
      // lo cubren los tests de axe y la ficha A-03.
      'jsx-a11y/control-has-associated-label': 'off',

      // Por defecto la regla cuenta `onError` como interacción, y con eso marca
      // el `<img>` de Avatar, cuyo `onError` solo cae a las iniciales cuando la
      // foto de Google devuelve 403. Se limita a los manejadores que de verdad
      // implican interacción.
      'jsx-a11y/no-noninteractive-element-interactions': [
        'warn',
        {
          handlers: [
            'onClick',
            'onMouseDown',
            'onMouseUp',
            'onKeyPress',
            'onKeyDown',
            'onKeyUp',
          ],
        },
      ],
    },
  },
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: ['eslint.config.js', 'prettier.config.js'],
  },
]
