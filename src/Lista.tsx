import { useCallback, useEffect, useState } from 'react'
import {
  acrescentar,
  carregarLista,
  mudarQuantidade,
  obterOuCriarLista,
  type ItemDaLista,
} from './lib/lista'
import { buscarProduto } from './lib/consulta'
import { useMercados } from './lib/mercado'
import type { Produto } from './lib/produto'

const real = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

export function Lista({ usuarioId }: { usuarioId: string }) {
  const { mercados } = useMercados()
  const [listaId, setListaId] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemDaLista[]>([])
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<Produto[]>([])

  const recarregar = useCallback(
    async (id: string) => setItens(await carregarLista(id, mercados)),
    [mercados],
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

  const comPreco = itens.filter((i) => i.melhor)
  const semPreco = itens.filter((i) => !i.melhor)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-neutral-800">Lista de compras</h2>

      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Adicionar item…"
        aria-label="Adicionar item à lista"
        className="min-h-11 rounded-lg border border-neutral-300 px-3"
      />

      {achados.length > 0 && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-neutral-200 p-1">
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
                className="min-h-11 w-full rounded px-3 py-2 text-left hover:bg-neutral-100"
              >
                <span className="text-neutral-900">{p.nome}</span>
                <span className="block text-sm text-neutral-600">
                  {p.marca ? `${p.marca} · ` : ''}
                  {p.quantidade} {p.unidade_medida}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {itens.length === 0 && (
        <p className="rounded-lg bg-neutral-100 p-4 text-neutral-800">
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
              aoMudar={async (q) => {
                await mudarQuantidade(i.itemId, q)
                if (listaId) await recarregar(listaId)
              }}
            />
          ))}
        </ul>
      )}

      {semPreco.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-600">
            Sem preço conhecido — registre quando vir na prateleira:
          </p>
          <ul className="flex flex-col gap-2">
            {semPreco.map((i) => (
              <ItemLinha
                key={i.itemId}
                item={i}
                aoMudar={async (q) => {
                  await mudarQuantidade(i.itemId, q)
                  if (listaId) await recarregar(listaId)
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {comPreco.length > 0 && <PorMercado itens={comPreco} />}
    </section>
  )
}

function ItemLinha({
  item,
  aoMudar,
}: {
  item: ItemDaLista
  aoMudar: (quantidade: number) => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-neutral-900">{item.produto.nome}</p>
        {item.melhor ? (
          <p className="text-sm text-neutral-600">
            {real(item.melhor.valor)} no {item.melhor.mercado.nome}
            {item.quantidade > 1 && (
              <> · {real(item.melhor.valor * item.quantidade)} no total</>
            )}
          </p>
        ) : (
          <p className="text-sm text-neutral-500">nenhum preço registrado</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => aoMudar(item.quantidade - 1)}
          aria-label={`Diminuir ${item.produto.nome}`}
          className="min-h-11 w-11 rounded-lg border border-neutral-300 text-neutral-700"
        >
          −
        </button>
        <span className="w-8 text-center tabular-nums">{item.quantidade}</span>
        <button
          type="button"
          onClick={() => aoMudar(item.quantidade + 1)}
          aria-label={`Aumentar ${item.produto.nome}`}
          className="min-h-11 w-11 rounded-lg border border-neutral-300 text-neutral-700"
        >
          +
        </button>
      </div>
    </li>
  )
}

/**
 * Agrupa por mercado o que já tem preço.
 *
 * Não é o total da cesta — esse é o RF-22, que ficou fora do MVP porque exige
 * cobertura que a base nova não tem. Aqui é só o roteiro: se você for a este
 * mercado, leva estes itens por este valor.
 */
function PorMercado({ itens }: { itens: ItemDaLista[] }) {
  const grupos = new Map<string, { nome: string; total: number; quantos: number }>()

  for (const i of itens) {
    if (!i.melhor) continue
    const atual = grupos.get(i.melhor.mercado.id) ?? {
      nome: i.melhor.mercado.nome,
      total: 0,
      quantos: 0,
    }
    atual.total += i.melhor.valor * i.quantidade
    atual.quantos += 1
    grupos.set(i.melhor.mercado.id, atual)
  }

  const ordenados = [...grupos.values()].sort((a, b) => b.quantos - a.quantos)

  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-sm font-medium text-neutral-800">
        Onde comprar o que já tem preço
      </p>
      <ul className="mt-1 flex flex-col gap-1 text-sm text-neutral-700">
        {ordenados.map((g) => (
          <li key={g.nome} className="flex justify-between gap-2">
            <span>
              {g.nome} · {g.quantos} {g.quantos === 1 ? 'item' : 'itens'}
            </span>
            <span className="tabular-nums">{real(g.total)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        Cada item mostrado no mercado mais barato. Isso pode espalhar a compra
        por vários lugares — comparar o total da cesta inteira num mercado só
        ainda não existe.
      </p>
    </div>
  )
}
