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

type Posicao = { lat: number; lon: number }

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

export type EstadoMercados = {
  carregando: boolean
  mercados: Mercado[]
  /** Ordenados por distância quando há posição; por nome quando não há. */
  sugerido: Mercado | null
  posicao: Posicao | null
  /** Cidade do mercado mais próximo. Nula sem localização. */
  cidade: string | null
}

export function useMercados(): EstadoMercados {
  const [estado, setEstado] = useState<EstadoMercados>({
    carregando: true,
    mercados: [],
    sugerido: null,
    posicao: null,
    cidade: null,
  })

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const [{ data }, posicao] = await Promise.all([
        supabase
          .from('mercado')
          .select('id, nome, endereco, latitude, longitude, cidade, rede(nome)')
          .order('nome'),
        obterPosicao(),
      ])
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

      let sugerido: Mercado | null = null
      if (posicao) {
        const comCoordenada = mercados.filter(
          (m) => m.latitude !== null && m.longitude !== null,
        )
        sugerido =
          comCoordenada
            .map((m) => ({
              m,
              d: distanciaM(posicao.lat, posicao.lon, m.latitude!, m.longitude!),
            }))
            .sort((a, b) => a.d - b.d)[0]?.m ?? null
      }

      setEstado({
        carregando: false,
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
