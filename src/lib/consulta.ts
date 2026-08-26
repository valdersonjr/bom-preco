import { supabase } from './supabase'
import { distanciaM, type Mercado } from './mercado'
import { semAcento } from './texto'

/** RF-16: preço com mais de 30 dias sai da comparação por padrão. */
export const DIAS_ATE_DESATUALIZAR = 30

export type PrecoNoMercado = {
  registroId: string
  mercado: Mercado
  valor: number
  tipo: 'tabela' | 'promocional'
  localConferido: boolean
  vistoEm: Date
  idadeEmDias: number
  desatualizado: boolean
  confirmacoesTerceiros: number
  autoconfirmacoes: number
  /** Metros até a pessoa, quando há posição e o mercado tem coordenada. */
  distanciaM: number | null
  /** Quando o preço foi visto na prateleira. Decide qual vigora no mercado. */
  observadoEm: Date
}

export type Posicao = { lat: number; lon: number }

function idadeEmDias(visto: Date): number {
  return Math.floor((Date.now() - visto.getTime()) / 86_400_000)
}

/**
 * Preços de um produto nos mercados (RF-12, RF-13, RF-15, RF-16).
 *
 * Lê de `preco_publico`, nunca da tabela: a visão é a única porta de leitura, e
 * é ela que omite a autoria (RNF-12). Só o mais recente do dia de cada pessoa
 * chega aqui — a visão já aplica a RD-04.
 */
export async function precosDoProduto(
  produtoId: string,
  mercados: Mercado[],
  posicao: Posicao | null,
  raioKm: number | null,
): Promise<PrecoNoMercado[]> {
  const { data } = await supabase
    .from('preco_publico')
    .select(
      'id, mercado_id, valor, tipo, local_conferido, visto_em, observado_em, confirmacoes_terceiros, autoconfirmacoes',
    )
    .eq('produto_id', produtoId)

  const porId = new Map(mercados.map((m) => [m.id, m]))

  const precos = (data ?? []).flatMap((linha) => {
    const mercado = porId.get(linha.mercado_id!)
    if (!mercado) return []

    const vistoEm = new Date(linha.visto_em!)
    const observadoEm = new Date(linha.observado_em!)
    const distancia =
      posicao && mercado.latitude !== null && mercado.longitude !== null
        ? distanciaM(posicao.lat, posicao.lon, mercado.latitude, mercado.longitude)
        : null

    const idade = idadeEmDias(vistoEm)
    return [
      {
        registroId: linha.id!,
        mercado,
        valor: Number(linha.valor),
        tipo: linha.tipo as 'tabela' | 'promocional',
        localConferido: Boolean(linha.local_conferido),
        vistoEm,
        idadeEmDias: idade,
        desatualizado: idade > DIAS_ATE_DESATUALIZAR,
        confirmacoesTerceiros: Number(linha.confirmacoes_terceiros ?? 0),
        autoconfirmacoes: Number(linha.autoconfirmacoes ?? 0),
        distanciaM: distancia,
        observadoEm,
      },
    ]
  })

  /*
    Um preço por mercado na comparação.

    `preco_publico` devolve o vigente de cada pessoa em cada dia — é a RD-04
    aplicada, e é o que alimenta o histórico. Mas a comparação é *entre*
    mercados: oito observações da mesma loja viravam oito linhas disputando
    entre si, o que só não aparecia porque a base estava vazia.

    Vence a observação mais recente, não o `visto_em` mais recente. Confirmar um
    preço antigo renova a idade dele (RD-14) e é para isso que serve, mas não o
    torna o preço atual da loja — quem viu depois viu depois.
  */
  const vigentePorMercado = new Map<string, (typeof precos)[number]>()
  for (const p of precos) {
    const atual = vigentePorMercado.get(p.mercado.id)
    if (!atual || p.observadoEm > atual.observadoEm) {
      vigentePorMercado.set(p.mercado.id, p)
    }
  }
  const unicos = [...vigentePorMercado.values()]

  const dentroDoRaio =
    raioKm === null
      ? unicos
      : unicos.filter((p) => p.distanciaM === null || p.distanciaM <= raioKm * 1000)

  // Mais barato primeiro. Empate desempata pelo mais recente, que é o que
  // alguém indo comprar hoje prefere.
  return dentroDoRaio.sort(
    (a, b) => a.valor - b.valor || b.vistoEm.getTime() - a.vistoEm.getTime(),
  )
}

/** Histórico de um produto num mercado, do mais recente ao mais antigo (RF-15). */
export async function historico(produtoId: string, mercadoId: string) {
  const { data } = await supabase
    .from('preco_publico')
    .select('id, valor, tipo, visto_em, observado_em')
    .eq('produto_id', produtoId)
    .eq('mercado_id', mercadoId)
    .order('observado_em', { ascending: false })
    .limit(50)

  return (data ?? []).map((l) => ({
    id: l.id!,
    valor: Number(l.valor),
    tipo: l.tipo as 'tabela' | 'promocional',
    observadoEm: new Date(l.observado_em!),
  }))
}

const COLUNAS_PRODUTO =
  'id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao'

/**
 * Busca produto por nome ou por código de barras digitado (RF-12).
 *
 * Só de dígitos e no comprimento de um GTIN, procura pelo código — é o caso de
 * quem tem a embalagem na mão mas não quer abrir a câmera, ou de quem está
 * consultando de casa com a foto do produto.
 */
/**
 * Quão bem o nome responde ao termo. Menor é melhor.
 *
 * Buscar "arroz" trazia, em ordem alfabética, quatro linhas de ração e macarrão
 * antes do primeiro pacote de arroz. Alfabeto não é relevância: ordena nomes,
 * não respostas.
 */
function nivelDeRelevancia(nome: string, palavras: string[]): number {
  const n = semAcento(nome)
  if (n.startsWith(palavras[0])) return 0
  // Palavra inteira: "Macarrão de Arroz" vence "Dog Chow E Arroz Integral".
  if (palavras.every((p) => new RegExp(`\\b${escapar(p)}`).test(n))) return 1
  return 2
}

function escapar(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Quantos candidatos buscar antes de ordenar. Mostra-se um terço disso. */
const MOSTRADOS = 30

/**
 * Busca produto por nome ou código de barras.
 *
 * Filtra por `nome_busca`, a coluna dobrada sem acento, para "feijao" e
 * "feijão" alcançarem a mesma prateleira.
 *
 * **Duas consultas em paralelo, não uma.** "leite" casa com centenas de
 * produtos; pedir um `limit` sem `order` devolveria um punhado qualquer deles,
 * e o item certo poderia nem entrar no poço a ser ordenado. A primeira consulta
 * pede quem *começa* com o termo, que é o nível de relevância mais alto e cabe
 * no índice; a segunda completa com quem apenas contém.
 *
 * A ordem final sai aqui: relevância textual primeiro, e ter preço recente
 * **desempatando dentro do mesmo nível**, nunca acima dele. Quem digitou
 * "arroz integral" quer arroz integral, mesmo que só o branco tenha preço; mas
 * entre dois arroz integrais igualmente relevantes, o que tem preço responde à
 * pergunta da tela e o outro não.
 *
 * Desempate final pelo nome mais curto. Não é arbitrário: no catálogo aberto o
 * nome curto costuma ser o produto genérico e o longo, o item específico e raro.
 */
export async function buscarProduto(termo: string) {
  const t = termo.trim()
  if (t.length < 2) return []

  if (/^\d{8,14}$/.test(t)) {
    const { data } = await supabase
      .from('produto')
      .select(COLUNAS_PRODUTO)
      .eq('gtin', t)
      .limit(MOSTRADOS)
    return data ?? []
  }

  /*
    Todas as palavras, em qualquer ordem, em vez da frase inteira como trecho.

    "sabao em po" não achava nada, porque exigia essa sequência exata dentro do
    nome. Ninguém escreve o nome do produto na ordem em que se pensa nele: o
    rótulo diz "Omo Lavagem Perfeita Sabão em Pó", e a pessoa digita "omo po"
    ou "sabao omo". Cada `ilike` encadeado vira um E na consulta.
  */
  const palavras = semAcento(t).split(/\s+/).filter(Boolean)

  const comTodasAsPalavras = (inicio: boolean) => {
    let q = supabase.from('produto').select(COLUNAS_PRODUTO)
    q = q.ilike('nome_busca', inicio ? `${palavras[0]}%` : `%${palavras[0]}%`)
    for (const p of palavras.slice(1)) q = q.ilike('nome_busca', `%${p}%`)
    return q.order('nome')
  }

  const [comeca, contem] = await Promise.all([
    comTodasAsPalavras(true).limit(MOSTRADOS),
    comTodasAsPalavras(false).limit(60),
  ])

  type Linha = NonNullable<typeof comeca.data>[number]
  const porId = new Map<string, Linha>()
  for (const p of [...(comeca.data ?? []), ...(contem.data ?? [])]) {
    if (!porId.has(p.id)) porId.set(p.id, p)
  }

  const candidatos = [...porId.values()]
  if (candidatos.length === 0) return []

  const comPreco = await quaisTemPrecoRecente(candidatos.map((p) => p.id))

  return candidatos
    .map((p) => ({
      p,
      nivel: nivelDeRelevancia(p.nome, palavras),
      temPreco: comPreco.has(p.id),
    }))
    .sort(
      (a, b) =>
        a.nivel - b.nivel ||
        Number(b.temPreco) - Number(a.temPreco) ||
        a.p.nome.length - b.p.nome.length ||
        a.p.nome.localeCompare(b.p.nome, 'pt-BR'),
    )
    .slice(0, MOSTRADOS)
    .map((x) => x.p)
}

/** Quais destes produtos têm preço dentro da janela de validade (RF-16). */
async function quaisTemPrecoRecente(ids: string[]): Promise<Set<string>> {
  const corte = new Date(
    Date.now() - DIAS_ATE_DESATUALIZAR * 86_400_000,
  ).toISOString()

  const { data } = await supabase
    .from('preco_publico')
    .select('produto_id')
    .in('produto_id', ids)
    .gte('visto_em', corte)

  return new Set((data ?? []).map((r) => r.produto_id).filter((x): x is string => !!x))
}


/**
 * Confirma que um preço continua valendo (RF-24, RF-25, RD-03, RD-14).
 *
 * Confirmar o próprio registro é permitido: com poucos usuários, sem isso nada
 * seria confirmado e a base inteira envelheceria até sair da comparação. O
 * gatilho no banco é que decide se é autoconfirmação, e ela vale menos.
 *
 * Uma por pessoa, por registro, por dia — a segunda no mesmo dia esbarra na
 * restrição de unicidade, e isso conta como sucesso: já estava confirmado.
 */
export async function confirmar(
  registroId: string,
  usuarioId: string,
): Promise<{ ok: true; jaHavia: boolean } | { ok: false; motivo: string }> {
  const { error } = await supabase
    .from('confirmacao')
    .insert({ registro_id: registroId, usuario_id: usuarioId })

  if (error && error.code !== '23505') {
    return { ok: false, motivo: error.message }
  }
  return { ok: true, jaHavia: Boolean(error) }
}
