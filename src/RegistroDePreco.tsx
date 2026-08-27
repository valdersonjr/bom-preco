import { useState } from 'react'
import { lerValor, montarRegistro, type Tipo } from './lib/registro'
import type { Mercado } from './lib/mercado'
import { precoEmTexto } from './lib/formato'
import { descricaoDoProduto, nomeDeProduto } from './lib/texto'
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
  /** Produto errado, ou mudou de ideia: volta a escolher, sem registrar nada. */
  aoDesistir: () => void
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
  aoDesistir,
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
      className="flex flex-col gap-5 rounded-xl border border-borda bg-elevado p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void salvar()
      }}
    >
      {/*
        O produto encaixa aqui, no alto do formulário, e a saída fica ao lado
        dele. Antes o cartão de "achei isto" renderizava abaixo do campo de
        preço, e a correção do produto errado era um link no rodapé: os dois
        longe de onde a dúvida acontece, que é ao ler o nome.
      */}
      <header className="flex items-start justify-between gap-3 border-b border-borda pb-4">
        <div className="min-w-0">
          <p className="font-medium text-tinta">{nomeDeProduto(produto.nome)}</p>
          <p className="mt-0.5 text-sm text-tinta-suave">
            {descricaoDoProduto(produto)}
          </p>
          {produto.gtin && (
            <p className="mt-1 font-mono text-xs text-tinta-fraca">
              {produto.gtin}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={aoDesistir}
          className="-mr-2 -mt-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-marca-forte"
        >
          Trocar
        </button>
      </header>

      {/*
        O campo de preço é a ação principal do app inteiro, e estava do tamanho
        de um campo de e-mail. Aqui ele tem o mesmo corpo do preço exibido nas
        outras telas: digitado de pé, com pressa, precisa ser conferível de
        relance antes de salvar.
      */}
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-tinta-suave">
          Preço na prateleira
        </span>
        <div className="flex items-center gap-2 rounded-xl border-2 border-borda-forte bg-superficie px-4 focus-within:border-marca">
          <span className="text-lg text-tinta-fraca">R$</span>
          <input
            required
            autoFocus
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="12,90"
            aria-describedby={porUnidade !== null ? 'por-unidade' : undefined}
            className="text-preco min-h-16 w-full bg-transparent tabular-nums outline-none placeholder:font-normal placeholder:text-tinta-fraca"
          />
        </div>
        {porUnidade !== null && (
          <span id="por-unidade" className="text-sm text-marca-forte">
            Sai a {precoEmTexto(porUnidade)} por {unidadeDeComparacao(produto)}
          </span>
        )}
      </label>

      {/*
        Sem legenda embaixo dos botões.

        Ela explicava que promoção fica marcada "para não ser confundida com o
        preço de prateleira quando a oferta acabar" — o motivo da RD-07, dito a
        quem só precisa escolher entre dois botões que já se explicam. E
        ocupava altura fixa mesmo quando não dizia nada, empurrando o botão de
        salvar para baixo numa tela que o RNF-07 quer curta.
      */}
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm text-tinta-suave">Este preço é</legend>
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
                  ? 'min-h-11 flex-1 rounded-lg bg-marca px-4 text-sobre-marca'
                  : 'min-h-11 flex-1 rounded-lg border border-borda-forte px-4 text-tinta-suave'
              }
            >
              {rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      {erro && <p className="text-perigo-tinta">{erro}</p>}

      <button
        type="submit"
        disabled={salvando}
        className="min-h-14 rounded-xl bg-marca px-4 text-lg font-medium text-sobre-marca disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : 'Salvar preço'}
      </button>

    </form>
  )
}
