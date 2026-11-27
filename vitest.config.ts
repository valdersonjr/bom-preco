import { defineConfig } from 'vitest/config'

/**
 * Configuração só dos testes, separada da do app.
 *
 * Os testes cobrem funções puras e não precisam de React, Tailwind nem do
 * service worker — carregar o `vite.config.ts` inteiro traria os três.
 *
 * As duas variáveis são postiças. O cliente do Supabase é criado quando o
 * módulo carrega e recusa nascer sem elas; com valores quaisquer ele nasce e
 * fica parado, porque nenhum teste chama a rede.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost',
      VITE_SUPABASE_ANON_KEY: 'chave-postica-de-teste',
    },
  },
})
