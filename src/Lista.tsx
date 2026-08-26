import { useCallback, useEffect, useState } from 'react'
import {
  acrescentar,
  carregarLista,
  mudarQuantidade,
  obterOuCriarLista,
  type ItemDaLista,
} from './lib/lista'
import { buscarProduto } from './lib/consulta'
import { naCidade, useMercados, type Mercado } from './lib/mercado'
import type { Produto } from './lib/produto'
import { precoEmTexto } from './lib/formato'
import { Preco } from './Preco'
import { ComoChegar } from './Mercado'
import { MapaDeMercados } from './MapaDeMercados'

export function Lista({ usuarioId }: { usuarioId: string }) {
  const { mercados, cidade } = useMercados()
  const [listaId, setListaId] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemDaLista[] | null>(null)
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<Produto[]>([])
  const [removido, setRemovido] = useState<Removido | null>(null)

  /** Estável de propósito: identidade nova reiniciaria o relógio do desfazer. */
  const dispensar = useCallback(() => setRemovido(null), [])

  const recarregar = useCallback(
    async (id: string) => setItens(await carregarLista(id, naCidade(mercados, cidade))),
    [mercados, cidade],
  )

  useEffect(() => {
    let ativo = true
    void obterOuCriarLista(usuarioId).then(async (id) => {
      if (!ativo) return
      setListaId(id)
      await recarregar(id)
    })
    return () => {
      ativo = false
    }
  }, [usuarioId, recarregar])

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

  const comPreco = (itens ?? []).filter((i) => i.melhor)
  const semPreco = (itens ?? []).filter((i) => !i.melhor)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-tinta">Lista de compras</h2>

      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Adicionar item…"
        aria-label="Adicionar item à lista"
        className="min-h-11 rounded-lg border border-borda-forte px-3"
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
                <span className="text-tinta">{p.nome}</span>
                <span className="block text-sm text-tinta-suave">
                  {p.marca ? `${p.marca} · ` : ''}
                  {p.quantidade} {p.unidade_medida}
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

      {itens?.length === 0 && (
        <p className="rounded-xl bg-sutil p-4 text-tinta">
          Sua lista está vazia. Vá acrescentando o que precisa comprar, e o app
          diz onde cada coisa está mais barata.
        </p>
      )}

      {comPreco.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comPreco.map((i) => (
            <ItemLinha
              key={i.itemId}
              item={i}
              aoMudar={(q) => void mudar(i, q)}
            />
          ))}
        </ul>
      )}

      {semPreco.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-suave">
            Sem preço conhecido — registre quando vir na prateleira:
          </p>
          <ul className="flex flex-col gap-2">
            {semPreco.map((i) => (
              <ItemLinha
                key={i.itemId}
                item={i}
                aoMudar={(q) => void mudar(i, q)}
              />
            ))}
          </ul>
        </div>
      )}

      {comPreco.length > 0 && <PorMercado itens={comPreco} />}
    </section>
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
        {removido.nome} saiu da lista.
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
}: {
  item: ItemDaLista
  aoMudar: (quantidade: number) => void
}) {
  const { melhor, produto, quantidade } = item

  return (
    <li className="rounded-xl border border-borda bg-elevado p-4">
      <p className="font-medium text-tinta">{produto.nome}</p>
      <p className="mt-0.5 text-sm text-tinta-fraca">
        {produto.marca ? `${produto.marca} · ` : ''}
        {produto.quantidade} {produto.unidade_medida}
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
            aria-label={`Diminuir ${produto.nome}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            −
          </button>
          <span className="w-8 text-center tabular-nums">{quantidade}</span>
          <button
            type="button"
            onClick={() => aoMudar(quantidade + 1)}
            aria-label={`Aumentar ${produto.nome}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            +
          </button>
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
function PorMercado({ itens }: { itens: ItemDaLista[] }) {
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
