import { useState } from 'react'
import { lerValor, montarRegistro, type Tipo } from './lib/registro'
import type { Mercado } from './lib/mercado'
import {
  precoPorUnidade,
  unidadeDeComparacao,
  type Produto,
} from './lib/produto'

type Props = {
  produto: Produto
  mercado: Mercado
  conferido: boolean
  usuarioId: string
  /** Enfileira e tenta enviar. Nunca falha por falta de rede — ver `useEnvio`. */
  registrar: (registro: ReturnType<typeof montarRegistro>) => Promise<void>
  aoSalvar: () => void
}

/**
 * Registra o preço visto na prateleira (RF-08, RF-11).
 *
 * Os controles ficam na parte de baixo (RNF-07): isto é usado de pé, com uma
 * mão, segurando o carrinho com a outra.
 */
export function RegistroDePreco({
  produto,
  mercado,
  conferido,
  usuarioId,
  registrar,
  aoSalvar,
}: Props) {
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<Tipo>('tabela')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valor = lerValor(texto)
  const porUnidade = valor === null ? null : precoPorUnidade(produto, valor)

  async function salvar() {
    if (valor === null) {
      setErro('Digite o preço, como 12,90.')
      return
    }
    setSalvando(true)
    setErro(null)

    // Vai para a fila antes de qualquer rede: sem sinal, fica guardado e sobe
    // depois. Do ponto de vista de quem cadastrou, salvou.
    await registrar(
      montarRegistro({ produto, mercado, usuarioId, valor, tipo, conferido }),
    )

    setSalvando(false)
    setTexto('')
    setTipo('tabela')
    aoSalvar()
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void salvar()
      }}
    >
      <div>
        <p className="font-medium text-neutral-900">{produto.nome}</p>
        <p className="text-sm text-neutral-600">
          {produto.marca ? `${produto.marca} · ` : ''}
          {produto.quantidade} {produto.unidade_medida} · em {mercado.nome}
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-neutral-700">Preço na prateleira</span>
        <div className="flex items-center gap-2">
          <span className="text-lg text-neutral-500">R$</span>
          <input
            required
            autoFocus
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="12,90"
            className="min-h-12 flex-1 rounded-lg border border-neutral-300 px-3 text-lg"
          />
        </div>
        {porUnidade !== null && (
          <span className="text-sm text-neutral-500">
            Sai a R$ {porUnidade.toFixed(2).replace('.', ',')} por{' '}
            {unidadeDeComparacao(produto)}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-neutral-700">Este preço é</legend>
        <div className="flex gap-2">
          {(
            [
              ['tabela', 'Normal'],
              ['promocional', 'Promoção'],
            ] as const
          ).map(([valorTipo, rotulo]) => (
            <button
              key={valorTipo}
              type="button"
              onClick={() => setTipo(valorTipo)}
              aria-pressed={tipo === valorTipo}
              className={
                tipo === valorTipo
                  ? 'min-h-11 flex-1 rounded-lg bg-green-700 px-4 text-white'
                  : 'min-h-11 flex-1 rounded-lg border border-neutral-300 px-4 text-neutral-700'
              }
            >
              {rotulo}
            </button>
          ))}
        </div>
        {tipo === 'promocional' && (
          <span className="text-sm text-neutral-500">
            Marcado como promoção, para não ser confundido com o preço de
            prateleira quando a oferta acabar.
          </span>
        )}
      </fieldset>

      {erro && <p className="text-red-800">{erro}</p>}

      <button
        type="submit"
        disabled={salvando}
        className="min-h-12 rounded-lg bg-green-700 px-4 text-lg text-white disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : 'Salvar preço'}
      </button>
    </form>
  )
}
