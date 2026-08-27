import { supabase } from './supabase'
import { corteDeValidade, maisRecentePor } from './consulta'
import type { Mercado } from './mercado'
import type { Produto } from './produto'

const NOME_PADRAO = 'Minha lista'

export type ItemDaLista = {
  itemId: string
  produto: Produto
  quantidade: number
  /** Já está no carrinho. Guarda o instante, para desmarcar sem inventar estado. */
  pego: boolean
  /** Nulo quando ninguém cadastrou preço válido para este produto. */
  melhor: { mercado: Mercado; valor: number; idadeEmDias: number } | null
}

const COLUNAS_PRODUTO =
  'id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao'

/**
 * Uma lista por pessoa, criada na primeira vez que precisar.
 *
 * O modelo permite várias, mas ninguém pediu várias. Criar a segunda quando
 * alguém quiser é barato; carregar a complexidade desde já, não.
 */
export async function obterOuCriarLista(usuarioId: string): Promise<string> {
  const { data: existente } = await supabase
    .from('lista')
    .select('id')
    .eq('usuario_id', usuarioId)
    .is('excluida_em', null)
    .limit(1)
    .maybeSingle()

  if (existente) return existente.id

  const { data, error } = await supabase
    .from('lista')
    .insert({ usuario_id: usuarioId, nome: NOME_PADRAO })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Não consegui criar a lista.')
  return data.id
}

/** Violação de unicidade no Postgres. */
const JA_EXISTE = '23505'

/**
 * Acrescenta um produto. Repetir o mesmo soma à quantidade em vez de criar
 * outra linha (RD-15).
 *
 * Ler e depois escrever tem uma janela no meio: duas telas da mesma conta
 * podem ler "não existe" e as duas tentarem inserir. Quem chega em segundo
 * esbarra na restrição de unicidade — e esse erro **é** a informação de que a
 * linha já existe, então a soma é refeita por cima dela. Antes o erro era
 * descartado em silêncio, e o segundo item simplesmente não entrava na lista.
 */
export async function acrescentar(
  listaId: string,
  produtoId: string,
  quantidade = 1,
): Promise<void> {
  const somarAoExistente = async (): Promise<boolean> => {
    const { data: existente } = await supabase
      .from('item_lista')
      .select('id, quantidade')
      .eq('lista_id', listaId)
      .eq('produto_id', produtoId)
      .maybeSingle()

    if (!existente) return false

    await supabase
      .from('item_lista')
      .update({ quantidade: Number(existente.quantidade) + quantidade })
      .eq('id', existente.id)
    return true
  }

  if (await somarAoExistente()) return

  const { error } = await supabase
    .from('item_lista')
    .insert({ lista_id: listaId, produto_id: produtoId, quantidade })

  if (error?.code === JA_EXISTE) await somarAoExistente()
}

/** Marca ou desmarca o item como já pego (RF-49). */
export async function marcarPego(itemId: string, pego: boolean) {
  await supabase
    .from('item_lista')
    .update({ pego_em: pego ? new Date().toISOString() : null })
    .eq('id', itemId)
}

export async function mudarQuantidade(itemId: string, quantidade: number) {
  if (quantidade <= 0) {
    await supabase.from('item_lista').delete().eq('id', itemId)
    return
  }
  await supabase.from('item_lista').update({ quantidade }).eq('id', itemId)
}

/**
 * Carrega a lista com o mercado mais barato de cada item (RF-20, RF-21).
 *
 * Os preços de todos os itens vêm numa consulta só, e não uma por item: lista
 * de compra do mês tem trinta linhas, e trinta idas ao servidor no 4G do
 * mercado é o que faz um app parecer travado.
 *
 * **O corte dos 30 dias é feito no servidor.** Antes vinha o histórico inteiro
 * de cada produto para o cliente descartar quase tudo — tráfego que cresce com
 * a base enquanto a resposta não muda.
 *
 * **E o preço de cada mercado é o vigente, não o menor.** Esta era a diferença
 * que fazia a lista e a consulta discordarem sobre o mesmo produto na mesma
 * loja: `preco_publico` devolve uma linha por pessoa por dia, e ficar com o
 * menor valor entre elas ressuscitava um preço de vinte dias atrás como se
 * fosse o da prateleira. `maisRecentePor` aplica aqui a mesma RD-04 que a
 * consulta já aplicava.
 */
export async function carregarLista(
  listaId: string,
  mercados: Mercado[],
): Promise<ItemDaLista[]> {
  const { data: itens } = await supabase
    .from('item_lista')
    .select(`id, quantidade, pego_em, produto:produto_id (${COLUNAS_PRODUTO})`)
    .eq('lista_id', listaId)
    // Ordem de inserção: é a ordem em que a pessoa pensou a compra.
    .order('criado_em')

  if (!itens || itens.length === 0) return []

  const produtoIds = itens.map((i) => i.produto?.id).filter((x): x is string => !!x)

  const { data: precos } = await supabase
    .from('preco_publico')
    .select('produto_id, mercado_id, valor, visto_em, observado_em')
    .in('produto_id', produtoIds)
    .gte('visto_em', corteDeValidade())

  const porMercado = new Map(mercados.map((m) => [m.id, m]))

  const vigentes = maisRecentePor(
    (precos ?? []).flatMap((p) => {
      const mercado = p.mercado_id ? porMercado.get(p.mercado_id) : undefined
      if (!mercado || !p.produto_id) return []
      return [
        {
          produtoId: p.produto_id,
          mercado,
          valor: Number(p.valor),
          vistoEm: new Date(p.visto_em!),
          observadoEm: new Date(p.observado_em!),
        },
      ]
    }),
    (p) => `${p.produtoId}|${p.mercado.id}`,
  )

  /** Menor preço vigente de cada produto, entre os mercados. */
  const melhorPorProduto = new Map<string, ItemDaLista['melhor']>()
  for (const p of vigentes) {
    const atual = melhorPorProduto.get(p.produtoId)
    if (!atual || p.valor < atual.valor) {
      melhorPorProduto.set(p.produtoId, {
        mercado: p.mercado,
        valor: p.valor,
        idadeEmDias: Math.floor(
          (Date.now() - p.vistoEm.getTime()) / 86_400_000,
        ),
      })
    }
  }

  return itens.flatMap((i) =>
    i.produto
      ? [
          {
            itemId: i.id,
            produto: i.produto,
            quantidade: Number(i.quantidade),
            pego: i.pego_em !== null,
            melhor: melhorPorProduto.get(i.produto.id) ?? null,
          },
        ]
      : [],
  )
}
