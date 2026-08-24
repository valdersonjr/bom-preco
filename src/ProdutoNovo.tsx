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
}

/**
 * Preenche um produto cujo código de barras a base pública não conhece
 * (RF-33, RD-09).
 *
 * Aqui a criação pelo usuário é permitida — ao contrário do item sem código,
 * que vem de catálogo curado. O GTIN garante a identidade: duas pessoas
 * preenchendo o mesmo código chegam ao mesmo produto, e não a dois.
 */
export function ProdutoNovo({ gtin, aoCriar }: Props) {
  const [nome, setNome] = useState('')
  const [marca, setMarca] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState<string>('g')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
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
      aoCriar(existente)
      return
    }

    const { data, error } = await supabase
      .from('produto')
      .insert({
        gtin,
        nome: nome.trim(),
        marca: marca.trim() || null,
        quantidade: Number(quantidade.replace(',', '.')),
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
      className="flex flex-col gap-3 rounded-xl border border-borda bg-elevado p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void salvar()
      }}
    >
      <p className="text-tinta-suave">
        Não conheço esse produto. Me conta o que é, e da próxima vez eu já sei.
      </p>

      <p className="text-sm text-tinta-fraca">
        Código de barras <strong className="font-mono">{gtin}</strong>
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-tinta-suave">Nome, como está na embalagem</span>
        <input
          required
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-h-11 rounded-lg border border-borda-forte px-3"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-tinta-suave">Marca</span>
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          className="min-h-11 rounded-lg border border-borda-forte px-3"
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
            className="min-h-11 rounded-lg border border-borda-forte px-3"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-tinta-suave">Unidade</span>
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="min-h-11 rounded-lg border border-borda-forte px-3"
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
        disabled={salvando}
        className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : 'Salvar produto'}
      </button>
    </form>
  )
}
