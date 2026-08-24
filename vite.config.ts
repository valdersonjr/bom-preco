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
        background_color: '#f7f8fa',
        theme_color: '#00713c',
        // Só PNG aqui. O iOS ignora SVG no ícone da tela inicial, e o Chrome
        // tropeça quando o SVG vem antes ao gerar o ícone do app instalado.
        // O SVG continua servindo como favicon, declarado no index.html.
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icone-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
