import { supabase } from './supabase'

/**
 * O que a pessoa registrou, lido de `meus_registros`.
 *
 * A visão já vem filtrada por quem chama; nada aqui passa identificador de
 * usuário, e é assim que deve ficar — filtro por autoria é assunto do banco
 * (RNF-12), não de um `eq` que alguém pode esquecer.
 */
export type MeuRegistro = {
  id: string
  valor: number
  tipo: 'tabela' | 'promocional'
  observadoEm: Date
  produto: string
  mercado: string
}

/** Quantos preços a pessoa registrou, em qualquer aparelho. Nulo se não deu para contar. */
export async function contarMeusRegistros(): Promise<number | null> {
  const { count, error } = await supabase
    .from('meus_registros')
    .select('id', { count: 'exact', head: true })
  return error ? null : (count ?? 0)
}

const COLUNAS =
  'id, valor, tipo, local_conferido, observado_em, produto:produto_id (gtin, nome, marca, quantidade, unidade_medida), mercado:mercado_id (nome, endereco, cidade)'

/** Os registros mais recentes, para a pessoa conferir o que fez. */
export async function meusRegistros(limite: number): Promise<MeuRegistro[]> {
  const { data, error } = await supabase
    .from('meus_registros')
    .select(COLUNAS)
    .order('observado_em', { ascending: false })
    .limit(limite)
  if (error) throw new Error(error.message)

  return (data ?? []).map((r) => ({
    id: r.id!,
    valor: Number(r.valor),
    tipo: r.tipo as 'tabela' | 'promocional',
    observadoEm: new Date(r.observado_em!),
    produto: r.produto?.nome ?? '',
    mercado: r.mercado?.nome ?? '',
  }))
}

/**
 * Tudo o que o app guarda sobre a pessoa, num arquivo só.
 *
 * Três coisas: os preços que ela registrou, a lista de compras e as compras
 * concluídas. São as três linhas da tabela de finalidades (§6) que têm
 * conteúdo — apelido vai no cabeçalho, e coordenada não existe para exportar.
 *
 * JSON, e não planilha, porque são três conjuntos com formas diferentes, e o
 * arquivo precisa ser fiel antes de ser bonito. Sai inteiro do navegador:
 * nenhum servidor monta nem guarda a cópia.
 */
export async function montarMeusDados(apelido: string): Promise<Blob> {
  const [registros, listas, compras] = await Promise.all([
    supabase
      .from('meus_registros')
      .select(COLUNAS)
      .order('observado_em', { ascending: false }),
    supabase
      .from('lista')
      .select(
        'nome, criado_em, itens:item_lista (quantidade, pego_em, produto:produto_id (gtin, nome, marca, quantidade, unidade_medida))',
      )
      .is('excluida_em', null),
    supabase
      .from('compra')
      .select(
        'concluida_em, mercado:mercado_id (nome, endereco, cidade), itens:item_compra (quantidade, produto:produto_id (gtin, nome, marca, quantidade, unidade_medida))',
      )
      .order('concluida_em', { ascending: false }),
  ])

  const falha = registros.error ?? listas.error ?? compras.error
  if (falha) throw new Error(falha.message)

  const conteudo = {
    exportado_em: new Date().toISOString(),
    apelido,
    precos_registrados: registros.data,
    listas: listas.data,
    compras: compras.data,
  }
  return new Blob([JSON.stringify(conteudo, null, 2)], {
    type: 'application/json',
  })
}
