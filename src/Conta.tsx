import { useState } from 'react'
import { deveConvidarAVincular, excluirConta, useVinculo } from './lib/vinculo'

/**
 * Tudo que é sobre a pessoa e não sobre preço: apelido, vínculo por e-mail,
 * exclusão e a atribuição das fontes de dados.
 */
export function Conta({
  anonimo,
  apelido,
  renomear,
}: {
  anonimo: boolean
  apelido: string
  renomear: (novo: string) => void
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-medium text-tinta">Sua conta</h2>
      <Apelido apelido={apelido} renomear={renomear} />
      <Vinculo anonimo={anonimo} />
      <Excluir />
      <Atribuicao />
    </section>
  )
}

function Apelido({
  apelido,
  renomear,
}: {
  apelido: string
  renomear: (novo: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')

  if (!editando) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-tinta">
          Você é <strong>{apelido}</strong>
        </span>
        <button
          type="button"
          className="min-h-11 rounded-lg px-3 text-marca-forte underline"
          onClick={() => {
            setRascunho(apelido)
            setEditando(true)
          }}
        >
          Trocar
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        renomear(rascunho)
        setEditando(false)
      }}
    >
      <input
        autoFocus
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        aria-label="Apelido"
        className="min-h-11 flex-1 rounded-lg border border-borda-forte px-3"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca"
      >
        Salvar
      </button>
    </form>
  )
}

function Vinculo({ anonimo }: { anonimo: boolean }) {
  const { situacao, vincularEmail } = useVinculo()
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')

  if (!anonimo) {
    return (
      <p className="text-sm text-tinta-suave">
        Sua conta está protegida: entrando com a mesma identidade em outro
        aparelho, você recupera tudo.
      </p>
    )
  }

  if (situacao.estado === 'enviado') {
    return (
      <aside className="rounded-xl border border-marca-borda bg-marca-fraca p-4 text-marca-forte">
        Enviamos um link para <strong>{situacao.email}</strong>. Abra o e-mail e
        confirme — só depois disso a conta fica ligada a você.
      </aside>
    )
  }

  if (!aberto) {
    return (
      <div className="flex flex-col gap-1">
        {deveConvidarAVincular(anonimo) && (
          <p className="text-alerta-tinta">
            Você já cadastrou alguns preços. Ligue a conta a um e-mail para não
            perder nada se trocar de aparelho.
          </p>
        )}
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-11 self-start rounded-lg px-3 text-marca-forte underline"
        >
          Proteger minha conta
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void vincularEmail(email)
      }}
    >
      <label htmlFor="email" className="text-sm text-tinta-suave">
        Seu e-mail. Você continua sendo a mesma pessoa aqui dentro — nada do que
        já cadastrou muda de dono.
      </label>
      <div className="flex gap-2">
        <input
          id="email"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-borda-forte px-3"
        />
        <button
          type="submit"
          disabled={situacao.estado === 'enviando'}
          className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca disabled:opacity-60"
        >
          {situacao.estado === 'enviando' ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      {situacao.estado === 'erro' && (
        <p className="text-perigo-tinta">{situacao.mensagem}</p>
      )}
    </form>
  )
}

/**
 * Excluir conta é irreversível, então pede confirmação — mas a confirmação
 * também explica o que sobrevive. Quem apaga a conta costuma temer perder algo;
 * aqui o medo é o oposto, de que os preços cadastrados sumam do app dos outros.
 */
function Excluir() {
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="min-h-11 self-start rounded-lg px-3 text-sm text-tinta-suave underline"
      >
        Excluir minha conta
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-perigo-borda bg-perigo-fraca p-3">
      <p className="text-perigo-tinta">
        Isso apaga sua conta, seu apelido e suas listas, e não tem volta.
      </p>
      <p className="text-sm text-perigo-tinta">
        Os preços que você cadastrou continuam no app, sem seu nome. Eles ajudam
        quem ficou, e ninguém consegue ligá-los a você depois disso.
      </p>
      {erro && <p className="text-sm text-perigo-tinta">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const r = await excluirConta()
            if (r.ok) location.reload()
            else setErro(r.motivo ?? 'Não consegui excluir.')
          }}
          className="min-h-11 rounded-lg bg-perigo px-4 text-sobre-perigo"
        >
          Excluir mesmo assim
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="min-h-11 rounded-lg px-4 text-tinta-suave underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

/** A ODbL exige creditar a fonte. Aqui é onde o crédito fica alcançável. */
function Atribuicao() {
  return (
    <p className="border-t border-borda pt-4 text-xs text-tinta-fraca">
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
    </p>
  )
}
