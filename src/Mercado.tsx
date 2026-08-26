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
 * O endereço, e ele mesmo leva até lá.
 *
 * Dentro do cartão de preço um botão separado de rota competia por atenção com
 * "confere" e "está diferente", que são de outra natureza: aqueles pedem um
 * julgamento sobre o preço, este só mostra onde fica. Virando o próprio
 * endereço, a ação encosta no dado a que pertence e some da fileira.
 */
export function EnderecoComRota({ mercado }: { mercado: Mercado }) {
  if (!mercado.endereco) return null

  return (
    <a
      href={urlDeRota(mercado)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Localização de ${mercado.nome}, abre no app de mapas`}
      className="mt-0.5 flex items-center gap-1 text-sm text-marca-forte"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <span className="truncate">{mercado.endereco}</span>
    </a>
  )
}
