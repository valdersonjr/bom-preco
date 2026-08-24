import { useState } from 'react'
import { deveConvidarAVincular, excluirConta, useVinculo } from './lib/vinculo'

export function Conta({ anonimo }: { anonimo: boolean }) {
  const { situacao, vincularEmail } = useVinculo()
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')

  if (!anonimo) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-sm text-neutral-600">
          Sua conta está protegida: entrando com a mesma identidade em outro
          aparelho, você recupera tudo.
        </p>
        <Excluir />
      </section>
    )
  }

  if (situacao.estado === 'enviado') {
    return (
      <aside className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
        Enviamos um link para <strong>{situacao.email}</strong>. Abra o e-mail e
        confirme — só depois disso a conta fica ligada a você.
      </aside>
    )
  }

  const convidando = deveConvidarAVincular(anonimo)

  return (
    <section className="flex flex-col gap-2">
      {!aberto && (
        <div className="flex flex-col gap-1">
          {convidando && (
            <p className="text-amber-800">
              Você já cadastrou alguns preços. Ligue a conta a um e-mail para
              não perder nada se trocar de aparelho.
            </p>
          )}
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="min-h-11 self-start rounded-lg px-3 text-green-800 underline"
          >
            Proteger minha conta
          </button>
        </div>
      )}

      {aberto && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void vincularEmail(email)
          }}
        >
          <label htmlFor="email" className="text-sm text-neutral-700">
            Seu e-mail. Você continua sendo a mesma pessoa aqui dentro — nada do
            que já cadastrou muda de dono.
          </label>
          <div className="flex gap-2">
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 flex-1 rounded-lg border border-neutral-300 px-3"
            />
            <button
              type="submit"
              disabled={situacao.estado === 'enviando'}
              className="min-h-11 rounded-lg bg-green-700 px-4 text-white disabled:opacity-60"
            >
              {situacao.estado === 'enviando' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {situacao.estado === 'erro' && (
            <p className="text-red-800">{situacao.mensagem}</p>
          )}
        </form>
      )}

      <Excluir />
    </section>
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
        className="min-h-11 self-start rounded-lg px-3 text-sm text-neutral-600 underline"
      >
        Excluir minha conta
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-red-900">
        Isso apaga sua conta, seu apelido e suas listas, e não tem volta.
      </p>
      <p className="text-sm text-red-900">
        Os preços que você cadastrou continuam no app, sem seu nome. Eles ajudam
        quem ficou, e ninguém consegue ligá-los a você depois disso.
      </p>
      {erro && <p className="text-sm text-red-900">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            const r = await excluirConta()
            if (r.ok) location.reload()
            else setErro(r.motivo ?? 'Não consegui excluir.')
          }}
          className="min-h-11 rounded-lg bg-red-700 px-4 text-white"
        >
          Excluir mesmo assim
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="min-h-11 rounded-lg px-4 text-neutral-700 underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
