import { useState } from 'react'
import { useSessao } from './lib/sessao'
import { ConviteDeInstalacao } from './ConviteDeInstalacao'
import { Conta } from './Conta'
import { Escaneamento } from './Escaneamento'

export default function App() {
  const sessao = useSessao()
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-green-800">Bom Preço</h1>
        <p className="text-neutral-600">
          Onde cada item da sua lista está mais barato.
        </p>
      </header>

      {sessao.situacao === 'carregando' && (
        <p className="text-neutral-500">Preparando…</p>
      )}

      {sessao.situacao === 'erro' && (
        <p className="rounded-lg bg-red-50 p-3 text-red-800">
          Não foi possível iniciar a sessão. {sessao.mensagem}
        </p>
      )}

      {sessao.situacao === 'pronto' && !editando && (
        <div className="flex items-center gap-3">
          <span className="text-neutral-800">
            Você é <strong>{sessao.perfil.apelido}</strong>
          </span>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-green-800 underline"
            onClick={() => {
              setRascunho(sessao.perfil.apelido)
              setEditando(true)
            }}
          >
            Trocar
          </button>
        </div>
      )}

      {sessao.situacao === 'pronto' && editando && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            sessao.renomear(rascunho)
            setEditando(false)
          }}
        >
          <input
            autoFocus
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            aria-label="Apelido"
            className="min-h-11 flex-1 rounded-lg border border-neutral-300 px-3"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-green-700 px-4 text-white"
          >
            Salvar
          </button>
        </form>
      )}

      {sessao.situacao === 'pronto' && <Escaneamento />}

      {sessao.situacao === 'pronto' && (
        <Conta anonimo={sessao.perfil.anonimo} />
      )}

      <ConviteDeInstalacao />

      <footer className="mt-auto border-t border-neutral-200 pt-4 text-xs text-neutral-500">
        Dados de produtos do{' '}
        <a
          href="https://world.openfoodfacts.org"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>
        , sob licença ODbL.
      </footer>
    </main>
  )
}
