import { useEffect, useMemo, useRef, useState } from 'react'
import { comCoordenada, urlDeRota, type Mercado } from './lib/mercado'

/**
 * O balão do alfinete, montado como elemento e não como texto.
 *
 * `bindPopup` com string interpreta o conteúdo como HTML, e o nome e o endereço
 * do mercado entravam ali crus. O catálogo é curado pelo mantenedor (RD-10), o
 * que torna o risco pequeno — mas era a única passagem de dado para HTML sem
 * escape no app inteiro, e `textContent` a fecha sem custo nenhum.
 */
function balao(mercado: Mercado): HTMLElement {
  const caixa = document.createElement('div')

  const nome = document.createElement('strong')
  nome.textContent = mercado.nome

  const endereco = document.createElement('div')
  endereco.textContent = mercado.endereco ?? ''

  const rota = document.createElement('a')
  rota.href = urlDeRota(mercado)
  rota.target = '_blank'
  rota.rel = 'noreferrer'
  rota.textContent = 'Como chegar'

  caixa.append(nome, endereco, rota)
  return caixa
}

/**
 * Mapa dos mercados (RF-44).
 *
 * **Leaflet entra sob demanda**, como o leitor de código de barras. São 42 KB
 * que só descem para quem abre o mapa — o RNF-08 dá 200 KB para o app inteiro,
 * e cobrar isso de quem nunca vai tocar no botão seria gastar o orçamento de
 * todos com a conveniência de alguns. O service worker o deixa de fora do
 * precache pelo mesmo motivo, e por mais um: mapa em cache sem tile em cache
 * abre vazio (ver `globIgnores` em `vite.config.ts`).
 *
 * **O mapa é incompleto de propósito, e diz isso.** Alfinete precisa de
 * coordenada, e só nove dos vinte e seis mercados têm. Um mapa que esconde
 * dezessete lojas sem avisar induz a conclusão errada — "não tem mercado ali" —
 * que é pior do que não ter mapa. O aviso fica abaixo, sempre.
 *
 * **Os tiles vêm da rede.** É a única tela do app que não funciona offline;
 * quando falha, sobram os links de rota, que continuam servindo.
 */
export function MapaDeMercados({ mercados }: { mercados: Mercado[] }) {
  const caixa = useRef<HTMLDivElement | null>(null)
  const [falhou, setFalhou] = useState(false)

  const plotaveis = useMemo(() => comCoordenada(mercados), [mercados])

  // O efeito não pode depender do array: ele é novo a cada render, e o mapa
  // seria destruído e reconstruído sem parar. Depende do que de fato mudaria
  // o desenho — quais pontos, e onde.
  const assinatura = plotaveis
    .map((m) => `${m.id}:${m.latitude},${m.longitude}`)
    .join('|')

  useEffect(() => {
    if (!assinatura) return
    let mapa: { remove: () => void } | null = null
    let vivo = true

    void (async () => {
      try {
        const L = await import('leaflet')
        await import('leaflet/dist/leaflet.css')
        if (!vivo || !caixa.current) return

        const pontos = assinatura.split('|').map((p) => {
          const [, coord] = p.split(':')
          const [lat, lon] = coord.split(',').map(Number)
          return [lat, lon] as [number, number]
        })

        const m = L.map(caixa.current, { scrollWheelZoom: false })
        mapa = m

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(m)

        plotaveis.forEach((mercado, i) => {
          // `divIcon` em vez do alfinete padrão: o ícone de imagem do Leaflet
          // quebra sob empacotador, e assim o pino usa as cores do sistema.
          L.marker(pontos[i], {
            icon: L.divIcon({
              className: '',
              html: '<span class="block size-3.5 rounded-full border-2 border-elevado bg-marca"></span>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
            title: mercado.nome,
          })
            .addTo(m)
            .bindPopup(balao(mercado))
        })

        m.fitBounds(L.latLngBounds(pontos), { padding: [32, 32], maxZoom: 16 })
      } catch {
        if (vivo) setFalhou(true)
      }
    })()

    return () => {
      vivo = false
      mapa?.remove()
    }
    // `plotaveis` entra só para ler nome e endereço; a assinatura é que manda.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura])

  const faltando = mercados.length - plotaveis.length

  if (plotaveis.length === 0) {
    return (
      <p className="rounded-xl bg-sutil p-3 text-sm text-tinta-suave">
        Nenhum destes mercados tem ponto no mapa ainda.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {falhou ? (
        <p className="rounded-xl bg-alerta-fraca p-3 text-sm text-alerta-tinta">
          Não consegui carregar o mapa. Provavelmente falta sinal.
        </p>
      ) : (
        <div
          ref={caixa}
          role="img"
          aria-label={`Mapa com ${plotaveis.length} ${plotaveis.length === 1 ? 'mercado' : 'mercados'}`}
          className="z-0 h-64 w-full overflow-hidden rounded-xl border border-borda bg-sutil"
        />
      )}

      {/* Este aviso fica: sem ele o mapa induz a conclusão de que não há
          mercado ali, que é pior do que não ter mapa. */}
      {faltando > 0 && (
        <p className="text-xs text-tinta-fraca">
          {faltando} {faltando === 1 ? 'mercado' : 'mercados'} sem ponto no
          mapa — {faltando === 1 ? 'está' : 'estão'} na lista acima.
        </p>
      )}
    </div>
  )
}
