import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Instalar na tela inicial não é conforto: no iOS é o que isenta o app
      // da limpeza de armazenamento após 7 dias sem uso, e com ela iriam a
      // sessão anônima e a fila de reenvio (risco R12).
      manifest: {
        name: 'Bom Preço',
        short_name: 'Bom Preço',
        description: 'Onde cada item da sua lista está mais barato',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#15803d',
        // SVG cobre Android. O iOS exige PNG para o ícone da tela inicial —
        // pendência do critério de aceitação da issue #1.
        icons: [
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml' },
          {
            src: 'icone.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
