/**
 * Barra de abas na base da tela.
 *
 * `sticky` numa coluna flex, e não `fixed`: barra fixa sobe junto com o
 * teclado no Android e cobre o campo que a pessoa está preenchendo.
 *
 * Na base, e não no topo, porque o app é usado com uma mão só — a outra empurra
 * o carrinho. O polegar alcança a base; o topo de um celular grande, não.
 *
 * Os ícones são SVG inline: nenhuma biblioteca de ícones cabe no orçamento de
 * 200 KB (RNF-08), e quatro desenhos não justificam uma dependência.
 */
export type Aba = 'lista' | 'buscar' | 'registrar' | 'conta'

const ABAS: { id: Aba; rotulo: string; icone: React.ReactNode }[] = [
  {
    id: 'lista',
    rotulo: 'Lista',
    icone: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
  },
  {
    id: 'buscar',
    rotulo: 'Buscar',
    icone: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    id: 'registrar',
    rotulo: 'Registrar',
    icone: (
      <>
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
      </>
    ),
  },
  {
    id: 'conta',
    rotulo: 'Conta',
    icone: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
]

export function Navegacao({
  ativa,
  aoTrocar,
  pendentes,
}: {
  ativa: Aba
  aoTrocar: (aba: Aba) => void
  /** Preços na fila offline. O aviso mora aqui para valer em qualquer aba. */
  pendentes: number
}) {
  return (
    <nav
      aria-label="Seções do app"
      className="sticky bottom-0 z-10 border-t border-borda bg-elevado pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {ABAS.map(({ id, rotulo, icone }) => {
          const selecionada = id === ativa
          const marcados = id === 'registrar' ? pendentes : 0
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => aoTrocar(id)}
                aria-current={selecionada ? 'page' : undefined}
                aria-label={
                  marcados > 0
                    ? `${rotulo}, ${marcados} aguardando sinal`
                    : undefined
                }
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 pt-1.5 pb-1 text-xs ${
                  selecionada
                    ? 'font-medium text-marca-forte'
                    : 'text-tinta-suave'
                }`}
              >
                <span
                  className={`relative flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                    selecionada ? 'bg-marca-fraca' : ''
                  }`}
                >
                  {marcados > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-2 min-w-4 rounded-full bg-alerta px-1 text-[10px] leading-4 font-medium text-sobre-alerta"
                    >
                      {marcados}
                    </span>
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={selecionada ? 2.2 : 1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {icone}
                  </svg>
                </span>
                {rotulo}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
