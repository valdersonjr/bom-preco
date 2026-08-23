import { useState } from 'react'
import { deveConvidarAVincular, useVinculo } from './lib/vinculo'

export function Conta({ anonimo }: { anonimo: boolean }) {
  const { situacao, vincularEmail } = useVinculo()
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')

  if (!anonimo) {
    return (
      <p className="text-sm text-neutral-600">
        Sua conta está protegida: entrando com a mesma identidade em outro
        aparelho, você recupera tudo.
      </p>
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
    </section>
  )
}
