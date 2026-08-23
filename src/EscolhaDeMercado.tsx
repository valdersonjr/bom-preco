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
export function EscolhaDeMercado({
  mercados,
  escolhido,
  conferido,
  temPosicao,
  carregando,
  aoEscolher,
}: Props) {
  const [trocando, setTrocando] = useState(false)

  if (carregando) {
    return <p className="text-neutral-500">Vendo onde você está…</p>
  }

  if (escolhido && !trocando) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3">
        <div>
          <p className="font-medium text-neutral-900">{escolhido.nome}</p>
          <p className="text-sm text-neutral-600">{escolhido.endereco}</p>
          {conferido && (
            <p className="mt-1 text-sm text-green-800">
              Você está aqui — o preço vai marcado como conferido no local.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setTrocando(true)}
          className="min-h-11 shrink-0 rounded-lg px-3 text-green-800 underline"
        >
          Trocar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-700">
        {temPosicao
          ? 'Em qual mercado você está?'
          : 'Sem localização. Escolha o mercado na lista.'}
      </p>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {mercados.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                aoEscolher(m)
                setTrocando(false)
              }}
              className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100"
            >
              <span className="text-neutral-900">{m.nome}</span>
              {m.rede && (
                <span className="text-sm text-neutral-500"> · {m.rede}</span>
              )}
              <span className="block text-sm text-neutral-600">{m.endereco}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">
        Não achou o mercado? Ele precisa ser cadastrado pelo mantenedor — é o que
        evita a mesma loja virar duas.
      </p>
    </div>
  )
}
