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
      /*
        O que fica guardado para funcionar sem sinal, e o que não fica.

        O padrão do Workbox é precachear tudo que sai no build, o que desfazia
        pelas costas a divisão de pacotes: o Leaflet era importado sob demanda
        para não custar nada a quem nunca abre o mapa, e o service worker o
        baixava assim mesmo, em segundo plano, para todo mundo.

        O corte não é por tamanho, é por utilidade offline. O mapa já não
        funciona sem rede — os tiles vêm do OpenStreetMap, e está escrito assim
        em `MapaDeMercados` —, então guardar o código dele é reservar espaço
        para uma tela que vai aparecer vazia de qualquer jeito.

        O ponyfill do leitor de código de barras fica, e é a mesma regra
        levando ao resultado oposto: ler etiqueta sem sinal é exatamente o que
        o RNF-06 protege, e no Safari do iOS não há API nativa para servir de
        alternativa. Ele não entra no pacote inicial — isso é o RNF-08 — mas
        precisa estar em cache antes de a pessoa chegar no corredor.
      */
      workbox: {
        globIgnores: ['**/leaflet-*'],
      },
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
