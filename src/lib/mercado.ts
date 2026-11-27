import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Mercado = {
  id: string
  nome: string
  endereco: string
  latitude: number | null
  longitude: number | null
  rede: string | null
  cidade: string
}

/**
 * Mercados da cidade onde a pessoa está.
 *
 * "A cidade toda" — o raio padrão do RF-12 — significa a cidade dela, não o
 * conjunto de tudo que existe no banco. Enquanto havia uma cidade só, os dois
 * eram a mesma coisa; com duas, comparar preço entre lojas a duzentos
 * quilômetros deixaria de ser comparação.
 *
 * Sem cidade conhecida, devolve tudo: é melhor mostrar demais do que esconder
 * o preço que a pessoa procura.
 */
export function naCidade(mercados: Mercado[], cidade: string | null): Mercado[] {
  return cidade ? mercados.filter((m) => m.cidade === cidade) : mercados
}

/** Tudo neste app é numa cidade só. O destino precisa dizer qual. */
const CIDADE = 'Goianésia - GO'

/**
 * Endereço da rota para o app de mapas do aparelho.
 *
 * Com coordenada, manda o ponto: é exato e não depende de o mapa reconhecer o
 * nome da loja. Sem coordenada — o caso de 17 dos 26 mercados hoje — manda o
 * texto, e o mapa resolve. É por isso que a rota funciona para todos e o mapa
 * embutido só para nove: navegação aceita endereço, alfinete precisa de ponto.
 */
export function urlDeRota(mercado: Mercado): string {
  const destino =
    mercado.latitude !== null && mercado.longitude !== null
      ? `${mercado.latitude},${mercado.longitude}`
      : [mercado.nome, mercado.endereco, CIDADE].filter(Boolean).join(', ')

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
}

/** Só quem tem ponto pode virar alfinete. */
export function comCoordenada(mercados: Mercado[]): Mercado[] {
  return mercados.filter((m) => m.latitude !== null && m.longitude !== null)
}

/** Metros até a pessoa, ou nulo quando falta a posição dela ou o ponto da loja. */
export function distanciaAte(
  mercado: Mercado,
  posicao: Posicao | null,
): number | null {
  if (!posicao || mercado.latitude === null || mercado.longitude === null) {
    return null
  }
  return distanciaM(posicao.lat, posicao.lon, mercado.latitude, mercado.longitude)
}

/** Raio provisório do RF-41, a confirmar com medição em campo. */
export const RAIO_CONFERIDO_M = 200

/**
 * Distância em metros pela fórmula de Haversine.
 *
 * Roda no dispositivo de propósito: a coordenada do usuário não trafega nem é
 * gravada (RD-13). O mercado já tem a dele, vindo do catálogo, então tudo que
 * sobe é o booleano.
 */
export function distanciaM(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLon = rad(bLon - aLon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export type Posicao = { lat: number; lon: number }

/** Localização é conveniência: recusar ou falhar não impede nada. */
function obterPosicao(): Promise<Posicao | null> {
  if (!navigator.geolocation) return Promise.resolve(null)
  return new Promise((resolver) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    )
  })
}

const CHAVE_ULTIMO = 'ultimo-mercado'

/** Por quanto tempo uma escolha manual ainda é "onde eu estou". */
const HORAS_DE_ESCOLHA_RECENTE = 3

/**
 * Guarda no aparelho o mercado que a pessoa escolheu à mão.
 *
 * Dezessete dos vinte e seis mercados não têm coordenada, então o GPS nunca os
 * sugere: quem compra num deles escolhia na lista a cada registro, e de novo a
 * cada troca de aba. Fica só no aparelho — é o identificador de uma loja do
 * catálogo, não uma posição, e nada disso sobe (RD-13).
 */
export function lembrarMercado(mercadoId: string) {
  try {
    localStorage.setItem(
      CHAVE_ULTIMO,
      JSON.stringify({ id: mercadoId, em: Date.now() }),
    )
  } catch {
    // Armazenamento bloqueado: a pessoa escolhe de novo, que é o que já fazia.
  }
}

function mercadoLembrado(): { id: string; em: number } | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO)
    if (!bruto) return null
    const lido = JSON.parse(bruto) as { id?: unknown; em?: unknown }
    return typeof lido.id === 'string' && typeof lido.em === 'number'
      ? { id: lido.id, em: lido.em }
      : null
  } catch {
    return null
  }
}

/**
 * A escolha manual das últimas horas, se ainda existir no catálogo.
 *
 * Vale mais que a sugestão do GPS: quem trocou o mercado à mão corrigiu o GPS,
 * e desfazer a correção na troca de aba seria o app teimando. Depois de
 * algumas horas a pessoa já saiu de lá, e a sugestão volta a mandar.
 */
export function escolhaRecente(mercados: Mercado[]): Mercado | null {
  const lembrado = mercadoLembrado()
  if (!lembrado) return null
  if (Date.now() - lembrado.em > HORAS_DE_ESCOLHA_RECENTE * 3_600_000) return null
  return mercados.find((m) => m.id === lembrado.id) ?? null
}

export type EstadoMercados = {
  /** O catálogo ainda não chegou. */
  carregando: boolean
  /**
   * O GPS ainda não respondeu. Separado de `carregando` porque são esperas de
   * tamanhos muito diferentes: o catálogo volta em meio segundo, a posição pode
   * levar oito — e a lista de compras só precisa do primeiro.
   */
  localizando: boolean
  mercados: Mercado[]
  /** O mais próximo quando há posição; o último escolhido quando não há. */
  sugerido: Mercado | null
  posicao: Posicao | null
  /** Cidade do mercado sugerido. Nula sem localização nem escolha anterior. */
  cidade: string | null
}

/** O mercado com coordenada mais perto da posição. */
function maisProximo(mercados: Mercado[], posicao: Posicao): Mercado | null {
  return (
    comCoordenada(mercados)
      .map((m) => ({
        m,
        d: distanciaM(posicao.lat, posicao.lon, m.latitude!, m.longitude!),
      }))
      .sort((a, b) => a.d - b.d)[0]?.m ?? null
  )
}

/**
 * Catálogo de mercados e posição, em duas etapas.
 *
 * Antes as duas coisas eram esperadas juntas, e a posição tem até oito
 * segundos para responder. Nesse intervalo a lista de compras não tinha
 * mercado nenhum para casar com os preços, e mostrava todos os itens como "sem
 * preço" — uma afirmação falsa que durava o tempo do GPS.
 *
 * Agora o catálogo é publicado assim que chega, com o último mercado escolhido
 * como palpite de onde a pessoa compra; a posição, quando vem, corrige o
 * palpite. Quem depende de saber *onde a pessoa está agora* — o registro de
 * preço — olha `localizando` e espera; quem só precisa do catálogo, não.
 */
export function useMercados(): EstadoMercados {
  const [estado, setEstado] = useState<EstadoMercados>({
    carregando: true,
    localizando: true,
    mercados: [],
    sugerido: null,
    posicao: null,
    cidade: null,
  })

  useEffect(() => {
    let ativo = true
    const aPosicao = obterPosicao()

    async function carregar() {
      const { data } = await supabase
        .from('mercado')
        .select('id, nome, endereco, latitude, longitude, cidade, rede(nome)')
        .order('nome')
      if (!ativo) return

      const mercados: Mercado[] = (data ?? []).map((m) => ({
        id: m.id,
        nome: m.nome,
        endereco: m.endereco,
        latitude: m.latitude,
        longitude: m.longitude,
        rede: m.rede?.nome ?? null,
        cidade: m.cidade,
      }))

      // Sem posição, o último mercado escolhido é o melhor palpite que existe,
      // por mais antigo que seja: ele diz ao menos em que cidade a pessoa
      // compra, e sem cidade a comparação misturaria todas.
      const id = mercadoLembrado()?.id
      const lembrado = mercados.find((m) => m.id === id) ?? null

      setEstado({
        carregando: false,
        localizando: true,
        mercados,
        sugerido: lembrado,
        posicao: null,
        cidade: lembrado?.cidade ?? null,
      })

      const posicao = await aPosicao
      if (!ativo) return

      const sugerido = posicao ? maisProximo(mercados, posicao) : lembrado
      setEstado({
        carregando: false,
        localizando: false,
        mercados,
        sugerido,
        posicao,
        cidade: sugerido?.cidade ?? null,
      })
    }

    void carregar()
    return () => {
      ativo = false
    }
  }, [])

  return estado
}

/**
 * Decide a marca de conferência (RF-41).
 *
 * Duas condições, não uma: estar dentro do raio **e** ser o mercado mais
 * próximo. No centro de Goianésia há lojas a 150 metros uma da outra, e só a
 * distância marcaria como conferido quem escolheu a loja vizinha — um sinal de
 * confiança que mente é pior que sinal nenhum.
 *
 * A troca é deliberada: com GPS impreciso a marca deixa de aparecer para quem
 * estava mesmo lá. Falso negativo apenas não marca; falso positivo corrompe o
 * sinal. E não marcar já é a degradação prevista quando o GPS falha.
 *
 * Sem posição ou sem coordenada do mercado, devolve falso. Nunca bloqueia.
 */
export function conferidoNoLocal(
  mercado: Mercado,
  posicao: Posicao | null,
  todos: Mercado[],
): boolean {
  if (!posicao || mercado.latitude === null || mercado.longitude === null) {
    return false
  }

  const daPessoa = distanciaM(
    posicao.lat,
    posicao.lon,
    mercado.latitude,
    mercado.longitude,
  )
  if (daPessoa > RAIO_CONFERIDO_M) return false

  const maisProximo = todos
    .filter((m) => m.latitude !== null && m.longitude !== null)
    .every(
      (m) =>
        distanciaM(posicao.lat, posicao.lon, m.latitude!, m.longitude!) >=
        daPessoa,
    )

  return maisProximo
}
