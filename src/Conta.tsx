import { useState } from 'react'
import {
  excluirConta,
  useRegistrosFeitos,
  useVinculo,
  vinculoRecomendado,
} from './lib/vinculo'

/**
 * Tela de conta, no formato de tela de ajustes.
 *
 * Antes eram cinco coisas soltas numa coluna: uma frase com o apelido, um botão
 * de proteger, um link de excluir e o crédito da base de dados, todos com o
 * mesmo peso e sem nada dizendo que assunto era qual. A exclusão da conta
 * ficava a um toque de distância da troca de apelido.
 *
 * O formato de grupos resolve isso sem inventar nada: identidade no alto,
 * ajustes agrupados por assunto, e o que não tem volta sozinho no fim. É o que
 * qualquer pessoa já sabe ler antes de abrir este app pela primeira vez.
 */
export function Conta({
  anonimo,
  apelido,
  renomear,
  abrirVinculo = false,
}: {
  anonimo: boolean
  apelido: string
  renomear: (novo: string) => void
  /** Chegou pelo convite: a linha do e-mail abre sozinha, com o campo focado. */
  abrirVinculo?: boolean
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="sr-only">Sua conta</h2>

      <Identidade apelido={apelido} anonimo={anonimo} />

      <Grupo titulo="Conta">
        <Apelido apelido={apelido} renomear={renomear} />
        <Vinculo anonimo={anonimo} comecaAberta={abrirVinculo} />
      </Grupo>

      <Grupo titulo="Sobre">
        <Sobre />
      </Grupo>

      <Grupo titulo="Zona de risco" perigo>
        <Excluir />
      </Grupo>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Peças do formato de ajustes
   ───────────────────────────────────────────────────────────────────────── */

/** Um bloco de assunto, com rótulo por cima e linhas divididas por dentro. */
function Grupo({
  titulo,
  perigo = false,
  children,
}: {
  titulo: string
  perigo?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-1 text-xs font-medium tracking-wide text-tinta-fraca uppercase">
        {titulo}
      </h3>
      <div
        className={`divide-y overflow-hidden rounded-xl border ${
          perigo
            ? 'divide-perigo-borda border-perigo-borda bg-perigo-fraca'
            : 'divide-borda border-borda bg-elevado'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Uma linha que abre no lugar, em vez de levar para outra tela.
 *
 * Não há navegador de telas neste app, e criar um para três formulários seria
 * mais peça do que benefício. Abrir embaixo mantém a pessoa onde ela estava e
 * dispensa o botão de voltar.
 */
function LinhaAbrivel({
  rotulo,
  valor,
  aberta,
  aoAlternar,
  perigo = false,
  children,
}: {
  rotulo: string
  valor?: React.ReactNode
  aberta: boolean
  aoAlternar: () => void
  perigo?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={aoAlternar}
        aria-expanded={aberta}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
      >
        <span
          className={`flex-1 ${
            perigo ? 'font-medium text-perigo-tinta' : 'text-tinta'
          }`}
        >
          {rotulo}
        </span>
        {valor && (
          <span className="max-w-[45%] truncate text-sm text-tinta-suave">
            {valor}
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${
            aberta ? 'rotate-90' : ''
          } ${perigo ? 'text-perigo-tinta' : 'text-tinta-fraca'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {aberta && (
        <div
          className={`anima-surgir border-t px-4 pt-3 pb-4 ${
            perigo ? 'border-perigo-borda' : 'border-borda'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Identidade
   ───────────────────────────────────────────────────────────────────────── */

/** Iniciais para o disco. "Comprador 0423" dá "C", porque 0 não é inicial. */
function iniciais(apelido: string): string {
  return (
    apelido
      .split(/\s+/)
      .filter((p) => /^\p{L}/u.test(p))
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  )
}

/**
 * Quem você é e em que estado está a conta.
 *
 * O estado anônimo era uma frase escondida no meio da tela, e é o que mais
 * importa: enquanto a conta não tem e-mail, ela vive só neste navegador. Dizer
 * isso de cara é mais honesto do que esperar a pessoa perder tudo para
 * descobrir.
 *
 * A contagem de preços vem do armazenamento local, porque o cliente não lê
 * `registro_preco`: a revogação que protege a autoria (RNF-12) também impede
 * contar do lado de cá. É por aparelho, e o texto diz isso.
 */
function Identidade({
  apelido,
  anonimo,
}: {
  apelido: string
  anonimo: boolean
}) {
  const registros = useRegistrosFeitos()

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-borda bg-elevado p-5">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-marca-fraca text-xl font-semibold text-marca-forte"
        >
          {iniciais(apelido)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-tinta">{apelido}</p>
          {anonimo ? (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-alerta-fraca px-2.5 py-1 text-xs font-medium text-alerta-tinta">
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
                <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4M12 17h.01" />
              </svg>
              Só neste aparelho
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-marca-fraca px-2.5 py-1 text-xs font-medium text-marca-forte">
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
              Conta protegida
            </p>
          )}
        </div>
      </div>

      <p className="border-t border-borda pt-4 text-sm text-tinta-suave">
        {registros === 0 ? (
          <>
            Você ainda não registrou nenhum preço. O primeiro já ajuda quem
            passar no mesmo corredor depois de você.
          </>
        ) : (
          <>
            <strong className="font-semibold text-tinta">
              {registros} {registros === 1 ? 'preço' : 'preços'}
            </strong>{' '}
            {registros === 1 ? 'registrado' : 'registrados'} neste aparelho.
          </>
        )}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Linhas
   ───────────────────────────────────────────────────────────────────────── */

function Apelido({
  apelido,
  renomear,
}: {
  apelido: string
  renomear: (novo: string) => void
}) {
  const [aberta, setAberta] = useState(false)
  const [rascunho, setRascunho] = useState(apelido)

  return (
    <LinhaAbrivel
      rotulo="Apelido"
      valor={apelido}
      aberta={aberta}
      aoAlternar={() => {
        setRascunho(apelido)
        setAberta((v) => !v)
      }}
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          renomear(rascunho)
          setAberta(false)
        }}
      >
        <p className="text-sm text-tinta-suave">
          É como você aparece para si mesmo. Ninguém mais vê: o autor de um
          preço nunca é mostrado.
        </p>
        <div className="flex gap-2">
          <input
            autoFocus
            required
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            aria-label="Apelido"
            className="min-h-12 flex-1 rounded-xl border border-borda-forte bg-superficie px-3"
          />
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-marca px-4 font-medium text-sobre-marca"
          >
            Salvar
          </button>
        </div>
      </form>
    </LinhaAbrivel>
  )
}

function Vinculo({
  anonimo,
  comecaAberta,
}: {
  anonimo: boolean
  comecaAberta: boolean
}) {
  const { situacao, vincularEmail } = useVinculo()
  const [aberta, setAberta] = useState(comecaAberta)
  const [email, setEmail] = useState('')

  if (!anonimo) {
    return (
      <div className="flex min-h-14 items-center gap-3 px-4 py-3">
        <span className="flex-1 text-tinta">E-mail</span>
        <span className="text-sm text-tinta-suave">confirmado</span>
      </div>
    )
  }

  return (
    <LinhaAbrivel
      rotulo="Proteger com e-mail"
      valor={vinculoRecomendado(anonimo) ? 'recomendado' : undefined}
      aberta={aberta}
      aoAlternar={() => setAberta((v) => !v)}
    >
      {situacao.estado === 'enviado' ? (
        <p className="text-marca-forte">
          Enviamos um link para <strong>{situacao.email}</strong>. Abra o e-mail
          e confirme. Só depois disso a conta fica ligada a você.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void vincularEmail(email)
          }}
        >
          <p className="text-sm text-tinta-suave">
            Hoje sua conta existe só neste navegador. Limpar os dados ou trocar
            de aparelho leva embora seu apelido e suas listas. Com um e-mail,
            você recupera tudo. Continua sendo a mesma pessoa aqui dentro, e
            nada do que já cadastrou muda de dono.
          </p>
          <div className="flex gap-2">
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              aria-label="Seu e-mail"
              className="min-h-12 flex-1 rounded-xl border border-borda-forte bg-superficie px-3"
            />
            <button
              type="submit"
              disabled={situacao.estado === 'enviando'}
              className="min-h-12 rounded-xl bg-marca px-4 font-medium text-sobre-marca disabled:opacity-60"
            >
              {situacao.estado === 'enviando' ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {situacao.estado === 'erro' && (
            <p className="text-sm text-perigo-tinta">{situacao.mensagem}</p>
          )}
        </form>
      )}
    </LinhaAbrivel>
  )
}

/**
 * O que o app faz com o que é seu, e de onde vêm os dados.
 *
 * A ODbL exige creditar a fonte, então o crédito precisa existir de qualquer
 * forma. Junto dele cabe a promessa que sustenta o uso do GPS (RD-13): a
 * coordenada é comparada no aparelho e nunca sobe. É a pergunta que qualquer
 * pessoa faz ao ver um app pedir localização, e respondê-la antes de ser
 * perguntada custa duas linhas.
 */
function Sobre() {
  return (
    <>
      <div className="flex min-h-14 items-center gap-3 px-4 py-3">
        <span className="flex-1 text-tinta">Dados de produtos</span>
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-marca-forte"
        >
          Open Food Facts
        </a>
      </div>
      <div className="px-4 py-3">
        <p className="text-tinta">Sua localização</p>
        <p className="mt-0.5 text-sm text-tinta-suave">
          Fica no aparelho. O app compara sua posição com a do mercado aqui
          mesmo, e envia apenas se você estava perto, nunca onde você estava.
        </p>
      </div>
      <p className="px-4 py-3 text-xs text-tinta-fraca">
        Catálogo de produtos sob licença ODbL.
      </p>
    </>
  )
}

/**
 * Excluir conta é irreversível, então pede confirmação. Mas a confirmação
 * também explica o que sobrevive: quem apaga a conta costuma temer perder algo,
 * e aqui o medo é o oposto, de que os preços cadastrados sumam do app dos
 * outros.
 */
function Excluir() {
  const [aberta, setAberta] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [apagando, setApagando] = useState(false)

  return (
    <LinhaAbrivel
      rotulo="Excluir minha conta"
      aberta={aberta}
      aoAlternar={() => setAberta((v) => !v)}
      perigo
    >
      <div className="flex flex-col gap-3">
        <p className="text-perigo-tinta">
          Isso apaga sua conta, seu apelido e suas listas, e não tem volta.
        </p>
        <p className="text-sm text-perigo-tinta">
          Os preços que você cadastrou continuam no app, sem seu nome. Eles
          ajudam quem ficou, e ninguém consegue ligá-los a você depois disso.
        </p>
        {erro && <p className="text-sm text-perigo-tinta">{erro}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={apagando}
            onClick={async () => {
              setApagando(true)
              const r = await excluirConta()
              if (r.ok) location.reload()
              else {
                setErro(r.motivo ?? 'Não consegui excluir.')
                setApagando(false)
              }
            }}
            className="min-h-12 rounded-xl bg-perigo px-4 font-medium text-sobre-perigo disabled:opacity-60"
          >
            {apagando ? 'Excluindo…' : 'Excluir mesmo assim'}
          </button>
          <button
            type="button"
            onClick={() => setAberta(false)}
            className="min-h-12 rounded-xl px-4 font-medium text-tinta-suave"
          >
            Cancelar
          </button>
        </div>
      </div>
    </LinhaAbrivel>
  )
}
