import { defineConfig } from 'vitest/config'

/*
 * Config aparte y NO derivada de `vite.config.ts` a propósito: ahí vive el plugin de
 * Cloudflare, que rechaza el `resolve.external` de Node con el que vitest arranca sus
 * workers. Lo que se prueba aquí es lógica pura (derivaciones de fechas y estados), que
 * no necesita el runtime del Worker.
 *
 * Para un test de componente, ponle `// @vitest-environment jsdom` en la primera línea
 * del archivo (jsdom y @testing-library ya están instalados).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
