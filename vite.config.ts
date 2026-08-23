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
        // PNG porque o iOS ignora SVG no ícone da tela inicial. O SVG fica
        // como primeiro, para telas de alta densidade no Android.
        icons: [
          { src: 'icone.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icone-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
