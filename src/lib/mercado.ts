import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Mercado = {
  id: string
  nome: string
  endereco: string
  latitude: number | null
  longitude: number | null
  rede: string | null
  cidade: string
  /** Identificador no OpenStreetMap. Nulo nos mercados cadastrados à mão. */
  osmId: string | null
  /**
   * O quanto se confia no local do mercado (RF-55): sem coordenada, com
   * coordenada marcada por um usuário e ainda não confirmada por outros, ou
   * confirmada — por fonte externa, pelo mantenedor ou por gente suficiente.
   * Quem decide é a visão `mercado_confianca`; o app só mostra.
   */
  situacao: 'sem_local' | 'a_confirmar' | 'confirmado'
}

/** Um mercado do catálogo importado que ainda ninguém ativou (RF-54). */
export type Candidato = {
  osmId: string
  nome: string
  endereco: string
  latitude: number
  longitude: number
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

/**
 * A que distância um candidato pode ser ativado.
 *
 * É a "barreira" do RF-54: a pessoa só libera o mercado perto do qual está.
 * Trezentos metros, e não os duzentos do "conferido no local", porque aqui o
 * erro do GPS só custa uma linha a mais numa lista curta — e apertar demais
 * esconderia o mercado de quem está dentro dele, com o sinal ruim de sempre.
 */
export const RAIO_DE_ATIVACAO_M = 300

/** Abaixo disto, candidato e mercado ativo são o mesmo lugar. */
const MESMO_LUGAR_M = 40

/** Até onde uma cidade atendida ainda é "a cidade onde a pessoa está". */
const RAIO_DA_CIDADE_M = 80_000

/** Candidatos já baixados, por cidade. Vale enquanto o app estiver aberto. */
const candidatosPorCidade = new Map<string, Promise<Candidato[]>>()

/**
 * O catálogo inteiro de uma cidade, em páginas.
 *
 * Vem a cidade toda, e não "os vizinhos deste ponto", porque pedir vizinhos
 * mandaria a posição do usuário ao servidor (RD-13). Brasília são umas
 * seiscentas linhas curtas; cabe, e só é pedido por quem abre a escolha de
 * mercado com a localização ligada.
 */
function candidatosDaCidade(cidade: string): Promise<Candidato[]> {
  let pedido = candidatosPorCidade.get(cidade)
  if (!pedido) {
    pedido = (async () => {
      const todos: Candidato[] = []
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase
          .from('mercado_candidato')
          .select('osm_id, nome, endereco, latitude, longitude, cidade')
          .eq('cidade', cidade)
          .order('osm_id')
          .range(de, de + 999)
        if (error) throw new Error(error.message)
        todos.push(
          ...data.map((c) => ({
            osmId: c.osm_id,
            nome: c.nome,
            endereco: c.endereco,
            latitude: c.latitude,
            longitude: c.longitude,
            cidade: c.cidade,
          })),
        )
        if (data.length < 1000) return todos
      }
    })()
    // Falhou: a próxima abertura tenta de novo, em vez de herdar o erro.
    pedido.catch(() => candidatosPorCidade.delete(cidade))
    candidatosPorCidade.set(cidade, pedido)
  }
  return pedido
}

/**
 * Os candidatos que a pessoa pode ativar agora: os do catálogo que estão perto
 * dela e que ainda não são mercado ativo (RF-54).
 *
 * "Já é ativo" tem duas formas: o mesmo identificador do OpenStreetMap, ou um
 * mercado cadastrado à mão no mesmo ponto. A segunda cobre os mercados antigos
 * que ninguém ligou ao catálogo.
 *
 * Tudo aqui roda no aparelho. A posição entra como argumento e não sai.
 */
export async function candidatosPerto(
  posicao: Posicao,
  cidade: string,
  ativos: Mercado[],
): Promise<{ candidato: Candidato; distancia: number }[]> {
  const doCatalogo = await candidatosDaCidade(cidade)
  const ativosPorOsm = new Set(ativos.map((m) => m.osmId).filter(Boolean))
  const comPonto = comCoordenada(ativos)

  return doCatalogo
    .filter((c) => !ativosPorOsm.has(c.osmId))
    .map((candidato) => ({
      candidato,
      distancia: distanciaM(
        posicao.lat,
        posicao.lon,
        candidato.latitude,
        candidato.longitude,
      ),
    }))
    .filter(({ distancia }) => distancia <= RAIO_DE_ATIVACAO_M)
    .filter(
      ({ candidato: c }) =>
        !comPonto.some(
          (m) =>
            distanciaM(c.latitude, c.longitude, m.latitude!, m.longitude!) <=
            MESMO_LUGAR_M,
        ),
    )
    .sort((a, b) => a.distancia - b.distancia)
    .slice(0, 8)
}

/**
 * Ativa o candidato e devolve o mercado pronto para uso.
 *
 * O banco decide se cria ou se devolve o que outra pessoa já criou — é o
 * identificador do OpenStreetMap, único, que faz dos dois o mesmo.
 */
export async function ativarMercado(c: Candidato): Promise<Mercado> {
  const { data, error } = await supabase.rpc('ativar_mercado', {
    p_osm_id: c.osmId,
  })
  if (error || !data) throw new Error(error?.message ?? 'Não consegui ativar.')
  return {
    id: data,
    nome: c.nome,
    endereco: c.endereco,
    latitude: c.latitude,
    longitude: c.longitude,
    rede: null,
    cidade: c.cidade,
    osmId: c.osmId,
    // Veio do catálogo: a fonte externa já vale a confirmação.
    situacao: 'confirmado',
  }
}

/**
 * "Estou aqui agora": dá coordenada a um mercado que não tem (RF-55).
 *
 * É o único ponto do app em que a posição da pessoa é enviada, e só acontece
 * por um toque dela num botão que diz o que faz. A posição vira a coordenada
 * do mercado; ver a exceção à RD-13 na migração `confianca_do_mercado`.
 *
 * O mercado volta "a confirmar": o alfinete de uma pessoa só passa a valer
 * como certo quando outras contas registrarem preço ali estando no local.
 */
export async function marcarLocal(mercado: Mercado, posicao: Posicao): Promise<Mercado> {
  const { error } = await supabase.rpc('marcar_local_do_mercado', {
    p_mercado: mercado.id,
    p_latitude: posicao.lat,
    p_longitude: posicao.lon,
  })
  if (error) throw new Error(error.message)
  return {
    ...mercado,
    latitude: posicao.lat,
    longitude: posicao.lon,
    situacao: 'a_confirmar',
  }
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
  /**
   * A cidade onde a pessoa está: a cidade atendida mais próxima da posição
   * dela, ou, sem posição, a do último mercado escolhido. Nula se nenhuma.
   */
  cidade: string | null
  /**
   * Põe no catálogo em memória o mercado que a pessoa acabou de ativar, ou
   * troca pela versão nova o que ela acabou de marcar no mapa.
   */
  incluir: (mercado: Mercado) => void
}

type Cidade = { cidade: string; latitude: number; longitude: number }

/**
 * Em que cidade atendida a pessoa está.
 *
 * Antes a cidade era a do mercado ativo mais próximo, e isso só funcionava
 * enquanto toda cidade tinha mercado ativo: quem abrisse o app em Valladolid
 * recebia "Goianésia", a oito mil quilômetros. Agora compara-se com o centro
 * das cidades do catálogo, no aparelho.
 */
function cidadeDaPosicao(cidades: Cidade[], posicao: Posicao): string | null {
  const perto = cidades
    .map((c) => ({
      c,
      d: distanciaM(posicao.lat, posicao.lon, c.latitude, c.longitude),
    }))
    .sort((a, b) => a.d - b.d)[0]
  return perto && perto.d <= RAIO_DA_CIDADE_M ? perto.c.cidade : null
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
  const [estado, setEstado] = useState<Omit<EstadoMercados, 'incluir'>>({
    carregando: true,
    localizando: true,
    mercados: [],
    sugerido: null,
    posicao: null,
    cidade: null,
  })

  const incluir = useCallback((mercado: Mercado) => {
    setEstado((e) => ({
      ...e,
      mercados: e.mercados.some((m) => m.id === mercado.id)
        ? e.mercados.map((m) => (m.id === mercado.id ? mercado : m))
        : [...e.mercados, mercado],
    }))
  }, [])

  useEffect(() => {
    let ativo = true
    const aPosicao = obterPosicao()

    async function carregar() {
      const [{ data }, { data: atendidas }, { data: confiancas }] = await Promise.all([
        supabase
          .from('mercado')
          .select('id, nome, endereco, latitude, longitude, cidade, osm_id, rede(nome)')
          .order('nome'),
        supabase.from('cidade_atendida').select('cidade, latitude, longitude'),
        supabase.from('mercado_confianca').select('mercado_id, situacao'),
      ])
      if (!ativo) return

      const cidades: Cidade[] = (atendidas ?? []).flatMap((c) =>
        c.cidade && c.latitude !== null && c.longitude !== null
          ? [{ cidade: c.cidade, latitude: c.latitude, longitude: c.longitude }]
          : [],
      )

      const situacaoDe = new Map(
        (confiancas ?? []).map((c) => [c.mercado_id, c.situacao]),
      )

      const mercados: Mercado[] = (data ?? []).map((m) => ({
        id: m.id,
        nome: m.nome,
        endereco: m.endereco,
        latitude: m.latitude,
        longitude: m.longitude,
        rede: m.rede?.nome ?? null,
        cidade: m.cidade,
        osmId: m.osm_id,
        // Se a visão não respondeu, vale o que a coordenada diz: ter local é
        // o que o app sabia antes de existir a conta de confiança.
        situacao:
          (situacaoDe.get(m.id) as Mercado['situacao'] | undefined) ??
          (m.latitude === null ? 'sem_local' : 'confirmado'),
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
      // `e.mercados`, e não `mercados`: a pessoa pode ter ativado um mercado
      // enquanto o GPS respondia, e a lista de então não o teria.
      setEstado((e) => ({
        carregando: false,
        localizando: false,
        mercados: e.mercados,
        sugerido,
        posicao,
        cidade:
          (posicao && cidadeDaPosicao(cidades, posicao)) ??
          sugerido?.cidade ??
          null,
      }))
    }

    void carregar()
    return () => {
      ativo = false
    }
  }, [])

  return { ...estado, incluir }
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
