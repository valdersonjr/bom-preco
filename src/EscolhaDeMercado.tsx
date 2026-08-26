import { useState } from 'react'
import { distanciaAte, type Mercado, type Posicao } from './lib/mercado'
import { distanciaEmTexto } from './lib/formato'
import { semAcento } from './lib/texto'

type Props = {
  mercados: Mercado[]
  escolhido: Mercado | null
  conferido: boolean
  /** Posição de quem está usando. Nula quando o GPS falhou ou foi recusado. */
  posicao: Posicao | null
  /** Cidade de quem está usando; a lista começa por ela. */
  cidade: string | null
  carregando: boolean
  aoEscolher: (mercado: Mercado) => void
}

/**
 * Apresenta a escolha do mercado (RF-06, RF-07).
 *
 * Não decide nada: quem sugere é o `useMercados` no componente acima, e a
 * escolha da pessoa mora lá também. Aqui só se mostra e se avisa do clique.
 */
export function EscolhaDeMercado({
  mercados,
  escolhido,
  conferido,
  posicao,
  cidade,
  carregando,
  aoEscolher,
}: Props) {
  const [trocando, setTrocando] = useState(false)
  const [filtro, setFiltro] = useState('')

  if (carregando) {
    return <p className="text-tinta-fraca">Vendo onde você está…</p>
  }

  if (escolhido && !trocando) {
    const distancia = distanciaAte(escolhido, posicao)
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-borda bg-elevado p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-tinta-fraca uppercase">
            Registrando em
          </p>
          <p className="mt-1 flex items-baseline gap-2 font-medium text-tinta">
            <span className="min-w-0 truncate">{escolhido.nome}</span>
            {distancia !== null && (
              <span className="shrink-0 text-sm font-normal tabular-nums text-tinta-suave">
                {distanciaEmTexto(distancia)}
              </span>
            )}
          </p>
          <p className="text-sm text-tinta-suave">
            {escolhido.endereco}
            {escolhido.cidade !== cidade && (
              <span className="text-tinta-fraca"> · {escolhido.cidade}</span>
            )}
          </p>
          {conferido && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-marca-fraca px-2.5 py-1 text-xs font-medium text-marca-forte">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Você está aqui
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTrocando(true)}
          className="-mr-2 -mt-2 min-h-11 shrink-0 rounded-lg px-2 text-sm font-medium text-marca-forte"
        >
          Trocar
        </button>
      </div>
    )
  }

  /*
    Filtro por nome, rede, endereço e cidade.

    São dezenas de mercados numa lista rolante, e o GPS só sugere os que têm
    coordenada. Quem está num dos outros rola a lista inteira, toda vez. O campo
    existe para essas pessoas.
  */
  const alvo = semAcento(filtro.trim())
  const encontrados = alvo
    ? mercados.filter((m) =>
        semAcento(
          `${m.nome} ${m.rede ?? ''} ${m.endereco ?? ''} ${m.cidade}`,
        ).includes(alvo),
      )
    : mercados

  /*
    Perto primeiro, dentro da cidade de quem está aqui.

    Mercado sem coordenada vai para o fim de cada grupo, em ordem de nome. São
    a maioria em Goianésia, e sumir com eles seria pior do que não saber a
    distância deles: o que falta é o levantamento de campo, não a loja.
  */
  const comDistancia = encontrados.map((m) => ({
    m,
    distancia: distanciaAte(m, posicao),
  }))

  const ordenar = (
    a: (typeof comDistancia)[number],
    b: (typeof comDistancia)[number],
  ) => {
    if (a.distancia !== null && b.distancia !== null)
      return a.distancia - b.distancia
    if (a.distancia !== null) return -1
    if (b.distancia !== null) return 1
    return a.m.nome.localeCompare(b.m.nome, 'pt-BR')
  }

  const visiveis = cidade
    ? [
        ...comDistancia.filter((x) => x.m.cidade === cidade).sort(ordenar),
        ...comDistancia.filter((x) => x.m.cidade !== cidade).sort(ordenar),
      ]
    : [...comDistancia].sort(ordenar)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-tinta-suave">
        {posicao
          ? 'Em qual mercado você está?'
          : 'Sem localização. Escolha o mercado na lista.'}
      </p>

      <input
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Filtrar por nome ou rua…"
        aria-label="Filtrar mercados"
        className="min-h-11 rounded-xl border border-borda-forte bg-elevado px-3"
      />

      {visiveis.length === 0 && (
        <p className="rounded-xl bg-sutil p-3 text-sm text-tinta-suave">
          Nenhum mercado com esse nome ou nessa rua.
        </p>
      )}

      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {visiveis.map(({ m, distancia }) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                aoEscolher(m)
                setTrocando(false)
              }}
              className="flex min-h-11 w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-sutil"
            >
              <span className="min-w-0 flex-1">
                <span className="text-tinta">{m.nome}</span>
                {m.rede && (
                  <span className="text-sm text-tinta-fraca"> · {m.rede}</span>
                )}
                <span className="block text-sm text-tinta-suave">
                  {m.endereco}
                  {m.cidade !== cidade && (
                    <span className="text-tinta-fraca"> · {m.cidade}</span>
                  )}
                </span>
              </span>
              {distancia !== null && (
                <span className="shrink-0 pt-0.5 text-sm tabular-nums text-tinta-suave">
                  {distanciaEmTexto(distancia)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-tinta-fraca">
        Não achou o mercado? Ele precisa ser cadastrado pelo mantenedor — é o que
        evita a mesma loja virar duas.
      </p>
    </div>
  )
}
