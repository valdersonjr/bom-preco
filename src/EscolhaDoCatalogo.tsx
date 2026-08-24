import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Produto } from './lib/produto'

type Props = {
  aoEscolher: (produto: Produto) => void
}

/**
 * Escolhe um item sem código de barras a partir do catálogo curado
 * (RF-04, RF-05, RD-08).
 *
 * Aqui não existe caminho para criar produto. Hortifruti, açougue, padaria e
 * granel vêm de lista fechada, e é isso que impede "tomate" e "Tomate italiano
 * kg" virarem dois produtos que nunca se comparam — o risco R3.
 */
export function EscolhaDoCatalogo({ aoEscolher }: Props) {
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<Produto[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    const termo = busca.trim()

    // Espera a digitação parar, para não disparar uma consulta por tecla.
    const id = setTimeout(async () => {
      const consulta = supabase
        .from('produto')
        .select('id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao')
        .eq('origem', 'catalogo')
        .order('nome')
        .limit(40)

      const { data } = termo
        ? await consulta.ilike('nome', `%${termo}%`)
        : await consulta

      if (!ativo) return
      setItens(data ?? [])
      setCarregando(false)
    }, termo ? 250 : 0)

    return () => {
      ativo = false
      clearTimeout(id)
    }
  }, [busca])

  return (
    <section className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-tinta-suave">
          Item sem código de barras
        </span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="tomate, alcatra, pão francês…"
          className="min-h-11 rounded-lg border border-borda-forte px-3"
        />
      </label>

      {carregando && <p className="text-tinta-fraca">Carregando…</p>}

      {!carregando && itens.length === 0 && (
        <p className="rounded-xl bg-sutil p-3 text-tinta">
          Não tenho esse item no catálogo. Me avise e eu acrescento — assim ele
          fica igual para todo mundo, em vez de cada um cadastrar um nome.
        </p>
      )}

      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {itens.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => aoEscolher(p)}
              className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-sutil"
            >
              <span className="text-tinta">{p.nome}</span>
              <span className="text-sm text-tinta-fraca">
                {' '}
                · por {p.unidade_medida === 'un' ? 'unidade' : p.unidade_medida}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
