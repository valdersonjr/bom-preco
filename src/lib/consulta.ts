import { supabase } from './supabase'
import { distanciaM, type Mercado } from './mercado'

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
export async function buscarProduto(termo: string) {
  const t = termo.trim()
  if (t.length < 2) return []

  const pareceCodigo = /^\d{8,14}$/.test(t)

  const { data } = pareceCodigo
    ? await supabase.from('produto').select(COLUNAS_PRODUTO).eq('gtin', t).limit(30)
    : await supabase
        .from('produto')
        .select(COLUNAS_PRODUTO)
        .ilike('nome', `%${t}%`)
        .order('nome')
        .limit(30)

  return data ?? []
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
