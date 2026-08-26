import { urlDeRota, type Mercado } from './lib/mercado'

/**
 * Abre a rota no app de mapas do aparelho (RF-43).
 *
 * É um link, não um mapa. Custa zero byte, e entrega para um aplicativo que já
 * tem os mapas da região baixados, sabe a sua posição e refaz a rota se você
 * errar a esquina, coisas que uma tela dentro deste app não faria melhor.
 */
export function ComoChegar({
  mercado,
  discreto = false,
}: {
  mercado: Mercado
  discreto?: boolean
}) {
  return (
    <a
      href={urlDeRota(mercado)}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg font-medium text-marca-forte ${
        discreto ? 'text-sm' : ''
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      Localização
    </a>
  )
}

/** Nome e endereço, do mesmo jeito em toda tela onde o mercado é resposta. */
export function EnderecoDoMercado({ mercado }: { mercado: Mercado }) {
  if (!mercado.endereco) return null
  return <p className="text-sm text-tinta-suave">{mercado.endereco}</p>
}

/**
 * Uma coluna da fileira de ações: ícone em cima, rótulo embaixo.
 *
 * Todas do mesmo tamanho de propósito. A hierarquia entre elas é de cor, não
 * de área: alvo menor para a ação secundária só faz errar quem está com pressa.
 */
export function Acao({
  rotulo,
  onClick,
  children,
  destaque = false,
  desabilitado = false,
}: {
  rotulo: string
  onClick: () => void
  children: React.ReactNode
  destaque?: boolean
  desabilitado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium ${
        desabilitado
          ? 'text-tinta-fraca'
          : destaque
            ? 'text-marca-forte'
            : 'text-tinta-suave'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
      {rotulo}
    </button>
  )
}

/** A mesma coluna, mas levando para fora do app: é link, não botão. */
export function AcaoDeLocalizacao({ mercado }: { mercado: Mercado }) {
  return (
    <a
      href={urlDeRota(mercado)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Localização de ${mercado.nome}, abre no app de mapas`}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-tinta-suave"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      Localização
    </a>
  )
}
