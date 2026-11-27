import { useEffect, useState } from 'react'
import {
  lerValor,
  longeDoEsperado,
  montarRegistro,
  type Tipo,
} from './lib/registro'
import type { Mercado } from './lib/mercado'
import { idadeEmTexto, precoEmTexto } from './lib/formato'
import { precosDoProduto, type PrecoNoMercado } from './lib/consulta'
import { descricaoDoProduto, nomeDeProduto } from './lib/texto'
import {
  precoPorUnidade,
  unidadeDeComparacao,
  type Produto,
} from './lib/produto'

type Props = {
  produto: Produto
  mercado: Mercado
  /** Mercados da cidade deste: é entre eles que "o menor em outro" faz sentido. */
  mercados: Mercado[]
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
  mercados,
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
  /** O valor que a pessoa já confirmou apesar de estranho. Outro valor, outra pergunta. */
  const [confirmado, setConfirmado] = useState<number | null>(null)

  /*
    O que já se sabe deste produto, buscado enquanto a pessoa digita.

    Registrar não devolvia nada a quem registra: escaneava, digitava, salvava,
    e a tela voltava para a câmera. Com uma pessoa só na base, a memória do
    próprio preço é a primeira resposta que o app tem para dar — "da última
    vez, aqui, era tanto" já vale a partir da segunda compra.

    Não bloqueia nada: sem conexão `precosDoProduto` devolve vazio, e o
    formulário é o mesmo de sempre (RNF-06).
  */
  const [conhecidos, setConhecidos] = useState<PrecoNoMercado[]>([])
  useEffect(() => {
    let ativo = true
    precosDoProduto(produto.id, mercados, null, null)
      .then((r) => {
        if (ativo) setConhecidos(r)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [produto.id, mercados])

  // Aqui vale o último visto, por mais velho que seja: a idade vai escrita ao
  // lado. Fora daqui só o recente, porque é uma sugestão de onde comprar hoje.
  const aqui = conhecidos.find((p) => p.mercado.id === mercado.id) ?? null
  // `precosDoProduto` já devolve do mais barato para o mais caro.
  const emOutro =
    conhecidos.find((p) => p.mercado.id !== mercado.id && !p.desatualizado) ??
    null

  const valor = lerValor(texto)
  const diferenca =
    valor !== null && aqui ? Math.round((valor - aqui.valor) * 100) / 100 : null
  const porUnidade = valor === null ? null : precoPorUnidade(produto, valor)
  // A referência é o preço daqui; sem ele, o de outro mercado. Um é o mesmo
  // produto na mesma loja, o outro é o mesmo produto — os dois denunciam uma
  // vírgula esquecida.
  const referencia = aqui?.valor ?? emOutro?.valor ?? null
  const estranho = valor !== null && longeDoEsperado(valor, referencia)
  const pedindoConfirmacao = estranho && confirmado === valor

  async function salvar() {
    if (valor === null) {
      setErro('Digite o preço, como 12,90.')
      return
    }
    if (estranho && confirmado !== valor) {
      setConfirmado(valor)
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
    setConfirmado(null)
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

      {(aqui || emOutro) && (
        <dl className="-mt-1 flex flex-col gap-1 text-sm">
          {aqui && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-tinta-suave">
                Aqui, {idadeEmTexto(aqui.idadeEmDias).replace('visto ', '')}
              </dt>
              <dd className="tabular-nums text-tinta">
                {precoEmTexto(aqui.valor)}
              </dd>
            </div>
          )}
          {emOutro && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="min-w-0 truncate text-tinta-suave">
                {emOutro.mercado.nome}
              </dt>
              <dd className="tabular-nums text-tinta">
                {precoEmTexto(emOutro.valor)}
              </dd>
            </div>
          )}
        </dl>
      )}

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
        {diferenca !== null && diferenca !== 0 && (
          <span
            className={`text-sm ${diferenca > 0 ? 'text-alerta-tinta' : 'text-marca-forte'}`}
          >
            {precoEmTexto(Math.abs(diferenca))}{' '}
            {diferenca > 0 ? 'a mais' : 'a menos'} que da última vez
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

      {/* Uma das poucas frases que ficam: é a confirmação do que não tem
          volta. Os dois números lado a lado são a pergunta inteira. */}
      {pedindoConfirmacao && valor !== null && referencia !== null && (
        <p role="alert" className="rounded-xl bg-alerta-fraca px-4 py-3 text-alerta-tinta">
          {precoEmTexto(valor)}? O último preço era {precoEmTexto(referencia)}.
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="min-h-14 rounded-xl bg-marca px-4 text-lg font-medium text-sobre-marca disabled:opacity-60"
      >
        {salvando
          ? 'Salvando…'
          : pedindoConfirmacao
            ? 'Está certo, salvar'
            : 'Salvar preço'}
      </button>

    </form>
  )
}
