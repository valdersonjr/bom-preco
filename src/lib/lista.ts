import { supabase } from './supabase'
import { DIAS_ATE_DESATUALIZAR } from './consulta'
import type { Mercado } from './mercado'
import type { Produto } from './produto'

const NOME_PADRAO = 'Minha lista'

export type ItemDaLista = {
  itemId: string
  produto: Produto
  quantidade: number
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

/**
 * Acrescenta um produto. Repetir o mesmo soma à quantidade em vez de criar
 * outra linha (RD-15) — a restrição de unicidade no banco garante isso mesmo se
 * duas telas tentarem ao mesmo tempo.
 */
export async function acrescentar(
  listaId: string,
  produtoId: string,
  quantidade = 1,
): Promise<void> {
  const { data: existente } = await supabase
    .from('item_lista')
    .select('id, quantidade')
    .eq('lista_id', listaId)
    .eq('produto_id', produtoId)
    .maybeSingle()

  if (existente) {
    await supabase
      .from('item_lista')
      .update({ quantidade: Number(existente.quantidade) + quantidade })
      .eq('id', existente.id)
    return
  }

  await supabase
    .from('item_lista')
    .insert({ lista_id: listaId, produto_id: produtoId, quantidade })
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
 */
export async function carregarLista(
  listaId: string,
  mercados: Mercado[],
): Promise<ItemDaLista[]> {
  const { data: itens } = await supabase
    .from('item_lista')
    .select(`id, quantidade, produto:produto_id (${COLUNAS_PRODUTO})`)
    .eq('lista_id', listaId)

  if (!itens || itens.length === 0) return []

  const produtoIds = itens.map((i) => i.produto?.id).filter((x): x is string => !!x)

  const { data: precos } = await supabase
    .from('preco_publico')
    .select('produto_id, mercado_id, valor, visto_em')
    .in('produto_id', produtoIds)

  const porMercado = new Map(mercados.map((m) => [m.id, m]))
  const limite = Date.now() - DIAS_ATE_DESATUALIZAR * 86_400_000

  /** Menor preço ainda válido de cada produto. */
  const melhorPorProduto = new Map<string, ItemDaLista['melhor']>()
  for (const p of precos ?? []) {
    const visto = new Date(p.visto_em!).getTime()
    if (visto < limite) continue

    const mercado = porMercado.get(p.mercado_id!)
    if (!mercado) continue

    const atual = melhorPorProduto.get(p.produto_id!)
    const valor = Number(p.valor)
    if (!atual || valor < atual.valor) {
      melhorPorProduto.set(p.produto_id!, {
        mercado,
        valor,
        idadeEmDias: Math.floor((Date.now() - visto) / 86_400_000),
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
            melhor: melhorPorProduto.get(i.produto.id) ?? null,
          },
        ]
      : [],
  )
}
