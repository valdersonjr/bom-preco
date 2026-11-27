import { supabase } from './supabase'
import { corteDeValidade, maisRecentePor } from './consulta'
import type { Mercado } from './mercado'
import { precoPorUnidade, type Produto } from './produto'
import { semAcento } from './texto'

const NOME_PADRAO = 'Minha lista'

/** Um produto que serve a um item de qualquer marca, num mercado, com preço válido. */
export type Opcao = {
  produto: Produto
  mercado: Mercado
  valor: number
  /** Por kg, litro ou unidade. É por ele que embalagens diferentes se comparam. */
  porUnidade: number | null
  idadeEmDias: number
}

export type ItemDaLista = {
  itemId: string
  /**
   * O produto do item. No item de produto exato, é ele. No de qualquer marca,
   * é o mais barato por unidade entre os que servem — e nulo enquanto nenhum
   * tiver preço válido.
   */
  produto: Produto | null
  /** Preenchido só no item de qualquer marca (RF-52): o que a pessoa escreveu. */
  termo: string | null
  /** As alternativas do item de qualquer marca, da mais barata por unidade em diante. */
  opcoes: Opcao[]
  /** Produtos que a pessoa disse que não servem a este item. */
  excluidos: string[]
  quantidade: number
  /** Já está no carrinho. Guarda o instante, para desmarcar sem inventar estado. */
  pego: boolean
  /** Nulo quando ninguém cadastrou preço válido para este produto. */
  melhor: {
    mercado: Mercado
    valor: number
    idadeEmDias: number
    /**
     * Quantos mercados tinham preço vigente para este produto. Com um só, o
     * "melhor" não venceu ninguém — e a tela precisa dizer isso, ou o único
     * preço conhecido passa por resultado de comparação.
     */
    entreQuantos: number
  } | null
  /**
   * Último preço conhecido quando nenhum é válido. Referência, não comparação:
   * passou dos 30 dias (RF-16), então não aponta onde comprar nem entra em
   * total nenhum — só diz quanto custava, onde, e há quanto tempo.
   */
  vencido: { mercado: Mercado; valor: number; idadeEmDias: number } | null
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
  const { data: existente, error: aoBuscar } = await supabase
    .from('lista')
    .select('id')
    .eq('usuario_id', usuarioId)
    .is('excluida_em', null)
    .limit(1)
    .maybeSingle()

  // "Não consegui perguntar" não é "não existe". Sem esta linha, uma falha de
  // rede aqui seguia para o `insert` e podia criar uma segunda lista vazia.
  if (aoBuscar) throw new Error(aoBuscar.message)
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

    const { error } = await supabase
      .from('item_lista')
      .update({ quantidade: Number(existente.quantidade) + quantidade })
      .eq('id', existente.id)
    if (error) throw new Error(error.message)
    return true
  }

  if (await somarAoExistente()) return

  const { error } = await supabase
    .from('item_lista')
    .insert({ lista_id: listaId, produto_id: produtoId, quantidade })

  if (error?.code === JA_EXISTE) await somarAoExistente()
  else if (error) throw new Error(error.message)
}

/**
 * O termo como é guardado e mostrado: minúsculo, só letras e números, palavras
 * separadas por um espaço — e com os acentos de quem escreveu.
 *
 * Pontuação sai porque não ajuda a achar nada e só serviria para o mesmo item
 * entrar duas vezes. O acento fica: tirá-lo aqui fazia a lista devolver
 * "Feijao Carioca" a quem tinha digitado certo.
 */
export function normalizarTermo(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * O termo como é comparado com `produto.nome_busca`: a mesma dobra sem acento
 * que o banco aplica ao nome. Só existe na hora de casar; nunca é guardado.
 */
function termoDeBusca(termo: string): string {
  return semAcento(termo)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Acrescenta um item de qualquer marca (RF-52). Repetir o termo soma à
 * quantidade, como no produto exato (RD-15).
 */
export async function acrescentarTermo(
  listaId: string,
  termo: string,
  quantidade = 1,
): Promise<void> {
  const normalizado = normalizarTermo(termo)
  if (normalizado.length < 2) return

  const { error } = await supabase
    .from('item_lista')
    .insert({ lista_id: listaId, termo: normalizado, quantidade })
  if (!error) return
  if (error.code !== JA_EXISTE) throw new Error(error.message)

  const { data: existente, error: aoLer } = await supabase
    .from('item_lista')
    .select('id, quantidade')
    .eq('lista_id', listaId)
    .eq('termo', normalizado)
    .maybeSingle()
  if (aoLer || !existente) throw new Error(aoLer?.message ?? 'Item não encontrado.')

  const { error: aoSomar } = await supabase
    .from('item_lista')
    .update({ quantidade: Number(existente.quantidade) + quantidade })
    .eq('id', existente.id)
  if (aoSomar) throw new Error(aoSomar.message)
}

/**
 * "Este não serve": o produto deixa de ser sugerido neste item.
 *
 * É a correção de quem usa sobre um casamento que é só por nome — "arroz"
 * também acha farinha de arroz. Fica guardada no item, então vale enquanto ele
 * existir e não contamina a lista de mais ninguém.
 */
export async function recusarOpcao(item: ItemDaLista, produtoId: string) {
  const { error } = await supabase
    .from('item_lista')
    .update({ excluidos: [...new Set([...item.excluidos, produtoId])] })
    .eq('id', item.itemId)
  if (error) throw new Error(error.message)
}

/**
 * "Só este": o item de qualquer marca vira item de produto exato.
 *
 * Se o produto já estava na lista, a linha não pode se repetir (RD-15): a
 * quantidade vai para a que já existe, e esta sai.
 */
export async function fixarProduto(
  listaId: string,
  item: ItemDaLista,
  produtoId: string,
) {
  const { error } = await supabase
    .from('item_lista')
    .update({ produto_id: produtoId, termo: null, excluidos: [] })
    .eq('id', item.itemId)
  if (!error) return
  if (error.code !== JA_EXISTE) throw new Error(error.message)

  await acrescentar(listaId, produtoId, item.quantidade)
  const { error: aoTirar } = await supabase
    .from('item_lista')
    .delete()
    .eq('id', item.itemId)
  if (aoTirar) throw new Error(aoTirar.message)
}

/** Marca ou desmarca o item como já pego (RF-49). */
export async function marcarPego(itemId: string, pego: boolean) {
  const { error } = await supabase
    .from('item_lista')
    .update({ pego_em: pego ? new Date().toISOString() : null })
    .eq('id', itemId)
  if (error) throw new Error(error.message)
}

export async function mudarQuantidade(itemId: string, quantidade: number) {
  const { error } =
    quantidade <= 0
      ? await supabase.from('item_lista').delete().eq('id', itemId)
      : await supabase.from('item_lista').update({ quantidade }).eq('id', itemId)
  if (error) throw new Error(error.message)
}

/**
 * Conclui a compra: o que está no carrinho sai da lista e fica guardado como
 * compra feita (RF-50).
 *
 * Uma chamada só, e a função do banco faz as três coisas juntas — ver a
 * migração `compra_concluida`. Devolve o identificador da compra, que é o que
 * o desfazer precisa; nulo quando não havia nada no carrinho.
 */
export async function concluirCompra(
  listaId: string,
  mercadoId: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('concluir_compra', {
    p_lista: listaId,
    ...(mercadoId ? { p_mercado: mercadoId } : {}),
  })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Desfaz a conclusão: apaga a compra e devolve os itens ao carrinho, marcados.
 *
 * Devolve primeiro e apaga depois. Se a rede cair no meio, sobra uma compra
 * gravada a mais — que é histórico impreciso — em vez de itens sumidos da
 * lista, que é trabalho perdido.
 */
export async function desfazerCompra(
  compraId: string,
  listaId: string,
  itens: { produtoId: string | null; termo: string | null; quantidade: number }[],
): Promise<void> {
  const agora = new Date().toISOString()
  const { error: aoDevolver } = await supabase.from('item_lista').insert(
    itens.map((i) => ({
      lista_id: listaId,
      produto_id: i.produtoId,
      termo: i.termo,
      quantidade: i.quantidade,
      pego_em: agora,
    })),
  )
  if (aoDevolver) throw new Error(aoDevolver.message)

  const { error } = await supabase.from('compra').delete().eq('id', compraId)
  if (error) throw new Error(error.message)
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
 *
 * **Falha lança, não devolve vazio.** Lista vazia é uma afirmação — "você não
 * tem nada aqui" — e a tela responde a ela com o cartão de primeira vez. Com o
 * erro engolido, sinal ruim dentro do mercado virava "sua lista sumiu".
 */
export async function carregarLista(
  listaId: string,
  mercados: Mercado[],
): Promise<ItemDaLista[]> {
  const { data: itens, error: aoLerItens } = await supabase
    .from('item_lista')
    .select(
      `id, quantidade, pego_em, termo, excluidos, produto:produto_id (${COLUNAS_PRODUTO})`,
    )
    .eq('lista_id', listaId)
    // Ordem de inserção: é a ordem em que a pessoa pensou a compra.
    .order('criado_em')

  if (aoLerItens || !itens) {
    throw new Error(aoLerItens?.message ?? 'Não consegui ler a lista.')
  }
  if (itens.length === 0) return []

  const produtoIds = itens.map((i) => i.produto?.id).filter((x): x is string => !!x)

  const { data: precos, error: aoLerPrecos } = await supabase
    .from('preco_publico')
    .select('produto_id, mercado_id, valor, visto_em, observado_em')
    .in('produto_id', produtoIds)
    .gte('visto_em', corteDeValidade())

  if (aoLerPrecos) throw new Error(aoLerPrecos.message)

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
  const melhorPorProduto = new Map<string, NonNullable<ItemDaLista['melhor']>>()
  for (const p of vigentes) {
    const atual = melhorPorProduto.get(p.produtoId)
    const entreQuantos = (atual?.entreQuantos ?? 0) + 1
    if (!atual || p.valor < atual.valor) {
      melhorPorProduto.set(p.produtoId, {
        mercado: p.mercado,
        valor: p.valor,
        idadeEmDias: Math.floor(
          (Date.now() - p.vistoEm.getTime()) / 86_400_000,
        ),
        entreQuantos,
      })
    } else {
      atual.entreQuantos = entreQuantos
    }
  }

  /*
    Segunda consulta, só para quem ficou sem preço válido.

    O corte de 30 dias continua no servidor para o caso comum. Aqui vem o
    histórico apenas dos produtos que sobraram, do mais novo para o mais velho,
    e fica-se com o primeiro de cada um. Com uma pessoa só registrando, um mês
    sem voltar a um mercado apagava da lista um preço que ela mesma tinha visto.

    Se falhar, a lista sai sem a referência: é complemento, e não vale derrubar
    a resposta principal por causa dele.
  */
  const semValido = produtoIds.filter((id) => !melhorPorProduto.has(id))
  const vencidoPorProduto = new Map<string, NonNullable<ItemDaLista['vencido']>>()

  if (semValido.length > 0) {
    const { data: antigos } = await supabase
      .from('preco_publico')
      .select('produto_id, mercado_id, valor, visto_em, observado_em')
      .in('produto_id', semValido)
      .order('observado_em', { ascending: false })
      .limit(500)

    for (const p of antigos ?? []) {
      const mercado = p.mercado_id ? porMercado.get(p.mercado_id) : undefined
      if (!mercado || !p.produto_id || vencidoPorProduto.has(p.produto_id)) continue
      vencidoPorProduto.set(p.produto_id, {
        mercado,
        valor: Number(p.valor),
        idadeEmDias: Math.floor(
          (Date.now() - new Date(p.visto_em!).getTime()) / 86_400_000,
        ),
      })
    }
  }

  const genericos = await opcoesPorTermo(
    itens.flatMap((i) =>
      i.termo ? [{ termo: i.termo, excluidos: i.excluidos }] : [],
    ),
    porMercado,
  )

  return itens.flatMap((i): ItemDaLista[] => {
    const base = {
      itemId: i.id,
      quantidade: Number(i.quantidade),
      pego: i.pego_em !== null,
      excluidos: i.excluidos,
    }

    if (i.termo) {
      const opcoes = genericos.get(i.termo) ?? []
      const primeira = opcoes[0]
      return [
        {
          ...base,
          termo: i.termo,
          produto: primeira?.produto ?? null,
          opcoes,
          melhor: primeira
            ? {
                mercado: primeira.mercado,
                valor: primeira.valor,
                idadeEmDias: primeira.idadeEmDias,
                entreQuantos: new Set(opcoes.map((o) => o.mercado.id)).size,
              }
            : null,
          vencido: null,
        },
      ]
    }

    if (!i.produto) return []
    return [
      {
        ...base,
        termo: null,
        produto: i.produto,
        opcoes: [],
        melhor: melhorPorProduto.get(i.produto.id) ?? null,
        vencido: vencidoPorProduto.get(i.produto.id) ?? null,
      },
    ]
  })
}

/** Quantas alternativas mostrar por item. Além disso é catálogo, não escolha. */
const OPCOES_POR_ITEM = 8

/**
 * As opções de cada item de qualquer marca (RF-52).
 *
 * Três decisões, todas sobre o que "mais barato" quer dizer quando os produtos
 * não são o mesmo:
 *
 * **Por unidade, não por etiqueta.** Entre um pacote de 1 kg e um de 5 kg, o
 * de 1 kg sempre custa menos. O que se compara é o quilo (RD-06).
 *
 * **Dentro de uma dimensão só.** "leite" casa com leite em litro e leite em pó
 * em grama, e preço por litro não se compara com preço por quilo (RD-05). Fica
 * a dimensão que mais aparece entre os candidatos; a outra a pessoa alcança
 * adicionando o produto exato.
 *
 * **Um preço por produto e mercado, o vigente.** A mesma `maisRecentePor` da
 * lista e da consulta — regra de leitura não se copia.
 *
 * Se a consulta falhar, os itens saem sem opção em vez de derrubar a lista: o
 * produto exato, que é a maior parte dela, não depende disto.
 */
async function opcoesPorTermo(
  itens: { termo: string; excluidos: string[] }[],
  porMercado: Map<string, Mercado>,
): Promise<Map<string, Opcao[]>> {
  const resultado = new Map<string, Opcao[]>()
  if (itens.length === 0) return resultado

  const { data } = await supabase.rpc('precos_por_termo', {
    p_termos: [...new Set(itens.map((i) => termoDeBusca(i.termo)))],
    p_desde: corteDeValidade(),
  })

  for (const { termo, excluidos } of itens) {
    const buscado = termoDeBusca(termo)
    const candidatos = (data ?? []).flatMap((l) => {
      const mercado = porMercado.get(l.mercado_id)
      if (l.termo !== buscado || !mercado || excluidos.includes(l.produto_id)) {
        return []
      }
      const produto: Produto = {
        id: l.produto_id,
        gtin: l.gtin,
        nome: l.nome,
        marca: l.marca,
        quantidade: Number(l.quantidade),
        unidade_medida: l.unidade_medida,
        quantidade_base: Number(l.quantidade_base),
        dimensao: l.dimensao,
      }
      const valor = Number(l.valor)
      return [
        {
          produto,
          mercado,
          valor,
          porUnidade: precoPorUnidade(produto, valor),
          vistoEm: new Date(l.visto_em),
          observadoEm: new Date(l.observado_em),
        },
      ]
    })

    resultado.set(termo, escolherOpcoes(candidatos, Date.now()))
  }

  return resultado
}

/** Um preço de um produto que casou com o termo, antes de qualquer escolha. */
export type Candidato = {
  produto: Produto
  mercado: Mercado
  valor: number
  porUnidade: number | null
  vistoEm: Date
  observadoEm: Date
}

/**
 * Dos candidatos de um termo, as opções em ordem — a parte da RD-16 que não
 * depende de rede, e por isso a parte que tem teste.
 *
 * Recebe o instante de fora, em vez de ler o relógio, para a idade ser a mesma
 * toda vez que o teste rodar.
 */
export function escolherOpcoes(candidatos: Candidato[], agora: number): Opcao[] {
  const vigentes = maisRecentePor(
    candidatos,
    (c) => `${c.produto.id}|${c.mercado.id}`,
  )

  const contagem = new Map<string | null, number>()
  for (const c of vigentes) {
    contagem.set(c.produto.dimensao, (contagem.get(c.produto.dimensao) ?? 0) + 1)
  }
  const dimensao = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  return vigentes
    .filter((c) => c.produto.dimensao === dimensao)
    .sort(
      (a, b) =>
        (a.porUnidade ?? Infinity) - (b.porUnidade ?? Infinity) ||
        a.valor - b.valor,
    )
    .slice(0, OPCOES_POR_ITEM)
    .map((c) => ({
      produto: c.produto,
      mercado: c.mercado,
      valor: c.valor,
      porUnidade: c.porUnidade,
      idadeEmDias: Math.floor((agora - c.vistoEm.getTime()) / 86_400_000),
    }))
}

/** Algo que a pessoa já comprou e que pode voltar para a lista com um toque. */
export type Costume = {
  /** Identifica a sugestão: o produto, ou o termo do item de qualquer marca. */
  chave: string
  produto: Produto | null
  termo: string | null
  /** Em quantas compras apareceu. */
  vezes: number
  ultimaEm: Date
}

/**
 * O que a pessoa costuma comprar, do mais frequente ao menos (RF-53).
 *
 * Frequência antes de recência: o que entra em toda compra é o que ela mais
 * quer não precisar digitar. O mais recente só desempata.
 *
 * Função pura, com os dados já lidos, pelo mesmo motivo de `escolherOpcoes`:
 * é regra de leitura, e regra de leitura tem teste.
 */
export function ordenarCostumes(
  comprados: { produto: Produto | null; termo: string | null; em: Date }[],
): Costume[] {
  const porChave = new Map<string, Costume>()
  for (const c of comprados) {
    const chave = c.termo ? `t:${c.termo}` : c.produto ? `p:${c.produto.id}` : null
    if (!chave) continue
    const atual = porChave.get(chave)
    if (!atual) {
      porChave.set(chave, {
        chave,
        produto: c.termo ? null : c.produto,
        termo: c.termo,
        vezes: 1,
        ultimaEm: c.em,
      })
    } else {
      atual.vezes += 1
      if (c.em > atual.ultimaEm) atual.ultimaEm = c.em
    }
  }
  return [...porChave.values()].sort(
    (a, b) => b.vezes - a.vezes || b.ultimaEm.getTime() - a.ultimaEm.getTime(),
  )
}

/**
 * Lê as compras concluídas da pessoa e devolve os costumes.
 *
 * As políticas de dono já restringem `item_compra` às compras de quem chama.
 * Trezentas linhas são meses de compra semanal; além disso o que se perde é o
 * que a pessoa já deixou de comprar. Falha devolve vazio: é sugestão, e a
 * lista funciona sem ela.
 */
export async function costumes(): Promise<Costume[]> {
  const { data } = await supabase
    .from('item_compra')
    .select(`termo, produto:produto_id (${COLUNAS_PRODUTO}), compra:compra_id (concluida_em)`)
    .order('id')
    .limit(300)

  return ordenarCostumes(
    (data ?? []).flatMap((i) =>
      i.compra
        ? [{ produto: i.produto, termo: i.termo, em: new Date(i.compra.concluida_em) }]
        : [],
    ),
  )
}
