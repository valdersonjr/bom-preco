import { useState } from 'react'
import { supabase } from './lib/supabase'
import type { Produto } from './lib/produto'

const UNIDADES = [
  { valor: 'g', rotulo: 'gramas (g)' },
  { valor: 'kg', rotulo: 'quilos (kg)' },
  { valor: 'mL', rotulo: 'mililitros (mL)' },
  { valor: 'L', rotulo: 'litros (L)' },
  { valor: 'un', rotulo: 'unidades' },
] as const

type Props = {
  gtin: string
  aoCriar: (produto: Produto) => void
  /** Voltou atrás: escaneou errado, ou não quer preencher agora. */
  aoDesistir: () => void
}

/**
 * Quantidade da embalagem: número positivo, com vírgula ou ponto.
 *
 * Aceita mais de duas casas, ao contrário de `lerValor`: preço tem centavos,
 * embalagem tem "1,5 L" e também "0,395 kg". O que não pode passar é vazio ou
 * texto — `Number('abc')` dá `NaN`, o banco recusa pela restrição `quantidade
 * > 0`, e o que a pessoa via era a mensagem crua do Postgres sobre uma *check
 * constraint*, no meio de um formulário em português.
 */
function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null
  const n = Number(limpo)
  return n > 0 ? n : null
}

/**
 * Preenche um produto cujo código de barras a base pública não conhece
 * (RF-33, RD-09).
 *
 * Aqui a criação pelo usuário é permitida — ao contrário do item sem código,
 * que vem de catálogo curado. O GTIN garante a identidade: duas pessoas
 * preenchendo o mesmo código chegam ao mesmo produto, e não a dois.
 */
export function ProdutoNovo({ gtin, aoCriar, aoDesistir }: Props) {
  const [nome, setNome] = useState('')
  const [marca, setMarca] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState<string>('g')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const medida = lerQuantidade(quantidade)

  async function salvar() {
    if (medida === null) {
      setErro('Informe a quantidade da embalagem, como 500 ou 1,5.')
      return
    }

    setSalvando(true)
    setErro(null)

    // Se outra pessoa cadastrou este código entre o escaneamento e agora,
    // aproveitamos o dela em vez de tentar criar um segundo.
    const { data: existente } = await supabase
      .from('produto')
      .select('id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao')
      .eq('gtin', gtin)
      .maybeSingle()

    if (existente) {
      setSalvando(false)
      aoCriar(existente)
      return
    }

    const { data, error } = await supabase
      .from('produto')
      .insert({
        gtin,
        nome: nome.trim(),
        marca: marca.trim() || null,
        quantidade: medida,
        unidade_medida: unidade,
        origem: 'usuario',
      })
      .select('id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao')
      .single()

    setSalvando(false)
    if (error || !data) {
      setErro(error?.message ?? 'Não consegui salvar.')
      return
    }
    aoCriar(data)
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-borda bg-elevado p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void salvar()
      }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-borda pb-4">
        <div className="min-w-0">
          <p className="text-tinta">
            Não conheço esse produto. Me conta o que é.
          </p>
          <p className="mt-1 font-mono text-xs text-tinta-fraca">{gtin}</p>
        </div>
        <button
          type="button"
          onClick={aoDesistir}
          className="-mr-2 -mt-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-marca-forte"
        >
          Voltar
        </button>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-tinta-suave">Nome, como está na embalagem</span>
        <input
          required
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-tinta-suave">Marca</span>
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-tinta-suave">Quantidade</span>
          <input
            required
            inputMode="decimal"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-tinta-suave">Unidade</span>
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
          >
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && <p className="text-perigo-tinta">{erro}</p>}

      <button
        type="submit"
        disabled={salvando || medida === null || !nome.trim()}
        className="min-h-12 rounded-xl bg-marca px-4 font-medium text-sobre-marca disabled:opacity-40"
      >
        {salvando ? 'Salvando…' : 'Salvar produto'}
      </button>
    </form>
  )
}
