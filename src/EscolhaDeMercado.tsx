import { useState } from 'react'
import type { Mercado } from './lib/mercado'

type Props = {
  mercados: Mercado[]
  escolhido: Mercado | null
  conferido: boolean
  temPosicao: boolean
  carregando: boolean
  aoEscolher: (mercado: Mercado) => void
}

/**
 * Apresenta a escolha do mercado (RF-06, RF-07).
 *
 * Não decide nada: quem sugere é o `useMercados` no componente acima, e a
 * escolha da pessoa mora lá também. Aqui só se mostra e se avisa do clique.
 */
/** "ebasico" precisa achar "Ébásico". Ninguém digita acento com pressa. */
function semAcento(t: string): string {
  return t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function EscolhaDeMercado({
  mercados,
  escolhido,
  conferido,
  temPosicao,
  carregando,
  aoEscolher,
}: Props) {
  const [trocando, setTrocando] = useState(false)
  const [filtro, setFiltro] = useState('')

  if (carregando) {
    return <p className="text-tinta-fraca">Vendo onde você está…</p>
  }

  if (escolhido && !trocando) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-xl border border-borda bg-elevado p-3">
        <div>
          <p className="font-medium text-tinta">{escolhido.nome}</p>
          <p className="text-sm text-tinta-suave">{escolhido.endereco}</p>
          {conferido && (
            <p className="mt-1 text-sm text-marca-forte">
              Você está aqui — o preço vai marcado como conferido no local.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTrocando(true)}
          className="min-h-11 shrink-0 rounded-lg px-3 text-marca-forte underline"
        >
          Trocar
        </button>
      </div>
    )
  }

  /*
    Filtro por nome, rede e endereço.

    São vinte e seis mercados numa lista rolante, e o GPS só sugere os que têm
    coordenada — hoje nove. Quem está num dos outros dezessete rola a lista
    inteira, toda vez. O campo existe para essas pessoas.
  */
  const alvo = semAcento(filtro.trim())
  const visiveis = alvo
    ? mercados.filter((m) =>
        semAcento(`${m.nome} ${m.rede ?? ''} ${m.endereco ?? ''}`).includes(alvo),
      )
    : mercados

  return (
    <div className="flex flex-col gap-2">
      <p className="text-tinta-suave">
        {temPosicao
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
        {visiveis.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                aoEscolher(m)
                setTrocando(false)
              }}
              className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-sutil"
            >
              <span className="text-tinta">{m.nome}</span>
              {m.rede && (
                <span className="text-sm text-tinta-fraca"> · {m.rede}</span>
              )}
              <span className="block text-sm text-tinta-suave">{m.endereco}</span>
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
