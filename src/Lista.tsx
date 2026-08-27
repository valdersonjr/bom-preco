import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acrescentar,
  carregarLista,
  marcarPego,
  mudarQuantidade,
  obterOuCriarLista,
  type ItemDaLista,
} from './lib/lista'
import { buscarProduto } from './lib/consulta'
import {
  distanciaAte,
  naCidade,
  type EstadoMercados,
  type Mercado,
  type Posicao,
} from './lib/mercado'
import type { Produto } from './lib/produto'
import { distanciaEmTexto, precoEmTexto } from './lib/formato'
import { Preco } from './Preco'
import { ComoChegar } from './Mercado'
import { MapaDeMercados } from './MapaDeMercados'
import { descricaoDoProduto, nomeDeProduto } from './lib/texto'

export function Lista({
  usuarioId,
  locais,
  aoIrPara,
}: {
  usuarioId: string
  /** Catálogo de mercados e posição, vindos de cima: um só por app. */
  locais: EstadoMercados
  aoIrPara: (aba: 'buscar' | 'registrar') => void
}) {
  const { mercados, cidade, posicao } = locais
  const [listaId, setListaId] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemDaLista[] | null>(null)
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<Produto[]>([])
  const [removido, setRemovido] = useState<Removido | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)

  /** Estável de propósito: identidade nova reiniciaria o relógio do desfazer. */
  const dispensar = useCallback(() => setRemovido(null), [])

  const daCidade = useMemo(() => naCidade(mercados, cidade), [mercados, cidade])

  const recarregar = useCallback(
    async (id: string) => setItens(await carregarLista(id, daCidade)),
    [daCidade],
  )

  /*
    Dois efeitos, e não um.

    Achar a lista depende só de quem é a pessoa; carregar o conteúdo dela
    depende também de quais mercados existem, e essa segunda coisa chega depois
    — primeiro sem mercado nenhum, depois com o catálogo. Num efeito só, a
    chegada do catálogo refazia a busca da lista no servidor junto.
  */
  useEffect(() => {
    let ativo = true
    void obterOuCriarLista(usuarioId).then((id) => {
      if (ativo) setListaId(id)
    })
    return () => {
      ativo = false
    }
  }, [usuarioId])

  // Com guarda de cancelamento, e não `recarregar` direto: o catálogo de
  // mercados chega depois da lista, então duas cargas podem estar no ar ao
  // mesmo tempo, e sem a guarda a que voltar por último vence — mesmo sendo a
  // que foi pedida primeiro, com o catálogo ainda vazio.
  useEffect(() => {
    if (!listaId) return
    let ativo = true
    void carregarLista(listaId, daCidade).then((r) => {
      if (ativo) setItens(r)
    })
    return () => {
      ativo = false
    }
  }, [listaId, daCidade])

  useEffect(() => {
    let ativo = true
    const t = setTimeout(async () => {
      const r = termo.trim() ? await buscarProduto(termo) : []
      if (ativo) setAchados(r)
    }, 250)
    return () => {
      ativo = false
      clearTimeout(t)
    }
  }, [termo])

  /**
   * Tirar item da lista não pede confirmação: pede desfazer.
   *
   * Confirmação antes de toda ação barata cansa quem acerta para proteger quem
   * erra. Desfazer inverte a conta — o acerto sai livre, e o erro custa um
   * toque. A confirmação fica onde o dano é real, na exclusão da conta.
   */
  async function mudar(item: ItemDaLista, quantidade: number) {
    await mudarQuantidade(item.itemId, quantidade)
    if (listaId) await recarregar(listaId)
    setRemovido(
      quantidade <= 0
        ? {
            produtoId: item.produto.id,
            nome: item.produto.nome,
            quantidade: item.quantidade,
          }
        : null,
    )
  }

  async function marcar(item: ItemDaLista, pego: boolean) {
    await marcarPego(item.itemId, pego)
    if (listaId) await recarregar(listaId)
  }

  /*
    Três grupos, e o que já foi pego desce para o fim.

    Dentro do mercado a lista encolhe conforme você anda, e o que sobra na
    frente é só o que falta. Manter o item pego no lugar, riscado, obriga a
    pular por cima dele em cada corredor.
  */
  const todos = itens ?? []
  const noCarrinho = todos.filter((i) => i.pego)
  const aComprar = todos.filter((i) => !i.pego && i.melhor)
  const semPreco = todos.filter((i) => !i.pego && !i.melhor)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-tinta">Lista de compras</h2>

      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Adicionar item…"
        aria-label="Adicionar item à lista"
        className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
      />

      {achados.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-borda bg-elevado p-1">
          {achados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={async () => {
                  if (!listaId) return
                  await acrescentar(listaId, p.id)
                  setTermo('')
                  setAchados([])
                  await recarregar(listaId)
                }}
                className="min-h-11 w-full rounded px-3 py-2 text-left hover:bg-sutil"
              >
                <span className="text-tinta">{nomeDeProduto(p.nome)}</span>
                <span className="block text-sm text-tinta-suave">
                  {descricaoDoProduto(p)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {removido && (
        <Desfazer
          removido={removido}
          aoDesfazer={async () => {
            if (!listaId) return
            await acrescentar(listaId, removido.produtoId, removido.quantidade)
            await recarregar(listaId)
            setRemovido(null)
          }}
          aoDispensar={dispensar}
        />
      )}

      {itens === null && <Esqueleto />}

      {itens?.length === 0 && <PrimeiraVez aoIrPara={aoIrPara} />}

      {aComprar.length > 0 && (
        <ul className="flex flex-col gap-2">
          {aComprar.map((i) => (
            <ItemLinha
              key={i.itemId}
              item={i}
              aoMudar={(q) => void mudar(i, q)}
              aoMarcar={(p) => void marcar(i, p)}
            />
          ))}
        </ul>
      )}

      {semPreco.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-suave">
            Ainda sem preço. Registre quando vir na prateleira.
          </p>
          <ul className="flex flex-col gap-2">
            {semPreco.map((i) => (
              <ItemLinha
                key={i.itemId}
                item={i}
                aoMudar={(q) => void mudar(i, q)}
                aoMarcar={(p) => void marcar(i, p)}
              />
            ))}
          </ul>
        </div>
      )}

      {aComprar.length > 0 && <PorMercado itens={aComprar} posicao={posicao} />}

      {noCarrinho.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCarrinhoAberto((v) => !v)}
            aria-expanded={carrinhoAberto}
            className="flex min-h-11 items-center gap-2 self-start rounded-lg text-sm font-medium text-tinta-suave"
          >
            No carrinho ({noCarrinho.length})
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-4 transition-transform ${carrinhoAberto ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {carrinhoAberto && (
            <ul className="anima-surgir flex flex-col gap-2">
              {noCarrinho.map((i) => (
                <ItemLinha
                  key={i.itemId}
                  item={i}
                  aoMudar={(q) => void mudar(i, q)}
                  aoMarcar={(p) => void marcar(i, p)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * O que se vê ao abrir o app pela primeira vez.
 *
 * Antes era uma frase cinza dizendo que a lista estava vazia, o que a pessoa já
 * sabia. Quem chega aqui por um link de um conhecido não sabe o que é isto, de
 * onde vêm os preços, nem qual é o primeiro movimento.
 *
 * Estado vazio é a única tela que todo mundo vê, e por isso o melhor lugar para
 * explicar o app. Um passo a mais que isso vira tutorial, e tutorial ninguém lê.
 */
function PrimeiraVez({
  aoIrPara,
}: {
  aoIrPara: (aba: 'buscar' | 'registrar') => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-borda bg-elevado p-5">
      <div>
        <p className="font-medium text-tinta">
          Monte sua lista e veja onde sai mais barato
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          Vá acrescentando o que precisa comprar. Para cada item o app mostra em
          qual mercado está o menor preço, e soma quanto ficaria em cada um.
        </p>
      </div>

      <p className="text-sm text-tinta-suave">
        Os preços vêm de quem passou pela prateleira antes de você. Quando você
        registra um, ajuda quem vier depois.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => aoIrPara('buscar')}
          className="min-h-11 rounded-lg bg-marca px-4 text-sm font-medium text-sobre-marca"
        >
          Ver um preço
        </button>
        <button
          type="button"
          onClick={() => aoIrPara('registrar')}
          className="min-h-11 rounded-lg border border-borda-forte px-4 text-sm font-medium text-tinta-suave"
        >
          Registrar um preço
        </button>
      </div>
    </div>
  )
}

type Removido = { produtoId: string; nome: string; quantidade: number }

/** Sete segundos é o tempo de ler a frase e decidir. Depois some sozinha. */
const SEGUNDOS_PARA_DESFAZER = 7

function Desfazer({
  removido,
  aoDesfazer,
  aoDispensar,
}: {
  removido: Removido
  aoDesfazer: () => void
  aoDispensar: () => void
}) {
  useEffect(() => {
    const t = setTimeout(aoDispensar, SEGUNDOS_PARA_DESFAZER * 1000)
    return () => clearTimeout(t)
  }, [removido, aoDispensar])

  return (
    <div
      role="status"
      className="anima-subir flex items-center justify-between gap-2 rounded-xl bg-inverso p-3 text-sobre-inverso"
    >
      <span className="min-w-0 truncate text-sm">
        {nomeDeProduto(removido.nome)} saiu da lista.
      </span>
      <button
        type="button"
        onClick={aoDesfazer}
        className="min-h-11 shrink-0 rounded-lg px-3 font-medium text-sobre-inverso underline"
      >
        Desfazer
      </button>
    </div>
  )
}

/**
 * Esqueleto enquanto a lista carrega.
 *
 * Sem ele a tela afirma "sua lista está vazia" antes de saber se está — uma
 * mentira curta, mas que faz a pessoa achar que perdeu o que tinha.
 */
function Esqueleto() {
  return (
    <ul aria-hidden="true" className="flex animate-pulse flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 rounded-xl border border-borda bg-elevado p-3">
          <div className="h-4 w-2/3 rounded bg-sutil-forte" />
          <div className="mt-2 h-3 w-1/2 rounded bg-sutil" />
        </li>
      ))}
    </ul>
  )
}

function ItemLinha({
  item,
  aoMudar,
  aoMarcar,
}: {
  item: ItemDaLista
  aoMudar: (quantidade: number) => void
  aoMarcar: (pego: boolean) => void
}) {
  const { melhor, produto, quantidade, pego } = item

  return (
    <li
      className={`rounded-xl border p-4 ${
        pego ? 'border-borda bg-superficie' : 'border-borda bg-elevado'
      }`}
    >
      <div className="flex items-start gap-3">
        {/*
          A marca de "já peguei" é a razão de a lista existir dentro do mercado.
          Sem ela a pessoa perde o lugar e confere tudo de novo a cada corredor.
        */}
        <button
          type="button"
          role="checkbox"
          aria-checked={pego}
          onClick={() => aoMarcar(!pego)}
          aria-label={`${pego ? 'Tirar do' : 'Pôr no'} carrinho: ${nomeDeProduto(produto.nome)}`}
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
            pego
              ? 'border-marca bg-marca text-sobre-marca'
              : 'border-borda-forte'
          }`}
        >
          {pego && (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
      <p className={`font-medium ${pego ? 'text-tinta-fraca line-through' : 'text-tinta'}`}>
        {nomeDeProduto(produto.nome)}
      </p>
      <p className="mt-0.5 text-sm text-tinta-fraca">
        {descricaoDoProduto(produto)}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {melhor ? (
            <>
              <Preco valor={melhor.valor} tamanho="medio" />
              <p className="mt-0.5 truncate text-sm text-tinta-suave">
                {melhor.mercado.nome}
                {quantidade > 1 && (
                  <>
                    {' · '}
                    {precoEmTexto(melhor.valor * quantidade)} no total
                  </>
                )}
              </p>
            </>
          ) : (
            /* O espaço do preço não colapsa quando não há preço: a lista
               continua alinhada, e a ausência fica evidente por comparação. */
            <p className="text-preco-menor font-normal text-tinta-fraca">
              sem preço
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => aoMudar(quantidade - 1)}
            aria-label={`Diminuir ${nomeDeProduto(produto.nome)}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            −
          </button>
          <span className="w-8 text-center tabular-nums">{quantidade}</span>
          <button
            type="button"
            onClick={() => aoMudar(quantidade + 1)}
            aria-label={`Aumentar ${nomeDeProduto(produto.nome)}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            +
          </button>
        </div>
      </div>
        </div>
      </div>
    </li>
  )
}

/**
 * Agrupa por mercado o que já tem preço — o roteiro da compra.
 *
 * Não é o total da cesta: esse é o RF-22, que ficou fora do MVP porque exige
 * cobertura que a base nova não tem. Aqui é só "se você for a este mercado,
 * leva estes itens por este valor".
 *
 * É a única tela do app em que vários mercados aparecem juntos, e por isso a
 * única em que o mapa mostra algo que a lista não mostra: que dois deles ficam
 * na mesma avenida. Vem fechado, porque o mapa custa rede e 42 KB — quem só
 * quer saber quanto vai gastar não paga por isso.
 */
function PorMercado({
  itens,
  posicao,
}: {
  itens: ItemDaLista[]
  posicao: Posicao | null
}) {
  const [mapaAberto, setMapaAberto] = useState(false)

  const grupos = new Map<
    string,
    { mercado: Mercado; total: number; quantos: number }
  >()

  for (const i of itens) {
    if (!i.melhor) continue
    const atual = grupos.get(i.melhor.mercado.id) ?? {
      mercado: i.melhor.mercado,
      total: 0,
      quantos: 0,
    }
    atual.total += i.melhor.valor * i.quantidade
    atual.quantos += 1
    grupos.set(i.melhor.mercado.id, atual)
  }

  const ordenados = [...grupos.values()].sort((a, b) => b.quantos - a.quantos)
  const mercados = ordenados.map((g) => g.mercado)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-borda bg-elevado p-4">
      <p className="font-medium text-tinta">Onde comprar</p>

      <ul className="flex flex-col gap-3">
        {ordenados.map((g) => (
          <li
            key={g.mercado.id}
            className="flex flex-col gap-0.5 border-t border-borda pt-3 first:border-0 first:pt-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-tinta">
                {g.mercado.nome}
              </span>
              <span className="shrink-0 tabular-nums text-tinta">
                {precoEmTexto(g.total)}
              </span>
            </div>
            <p className="text-sm text-tinta-suave">
              {g.quantos} {g.quantos === 1 ? 'item' : 'itens'}
              {distanciaAte(g.mercado, posicao) !== null && (
                <> · {distanciaEmTexto(distanciaAte(g.mercado, posicao)!)}</>
              )}
              {g.mercado.endereco && <> · {g.mercado.endereco}</>}
            </p>
            <ComoChegar mercado={g.mercado} discreto />
          </li>
        ))}
      </ul>

      {mapaAberto ? (
        <MapaDeMercados mercados={mercados} />
      ) : (
        <button
          type="button"
          onClick={() => setMapaAberto(true)}
          className="min-h-11 self-start rounded-lg text-sm font-medium text-marca-forte"
        >
          Ver no mapa
        </button>
      )}

      <p className="text-xs text-tinta-fraca">
        Cada item aparece no mercado mais barato. Isso pode espalhar a compra
        por vários lugares — comparar o total da cesta inteira num mercado só
        ainda não existe.
      </p>
    </div>
  )
}
