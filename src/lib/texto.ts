/**
 * Normaliza o que vem do catálogo para a tela.
 *
 * A base de produtos é colaborativa e aberta, então cada pessoa digitou de um
 * jeito: "Arroz  branco" com dois espaços, "presunto cozido" tudo minúsculo,
 * "Sequilho QUALITÁ Leite Condensado" com a marca gritando, "Vidro 170g" sem
 * espaço antes da unidade.
 *
 * Nada disso se conserta no banco. O dado é de terceiro, chega por importação
 * e volta a chegar torto na próxima carga; corrigir na origem seria manter uma
 * cópia divergente da fonte. Conserta na exibição, que é onde incomoda.
 */

/**
 * Texto dobrado para comparação: sem acento, em caixa baixa.
 *
 * O mesmo que a coluna `nome_busca` faz no banco. Aqui serve para ordenar o que
 * já veio de lá, e para filtrar listas que estão inteiras na memória.
 */
export function semAcento(t: string): string {
  return t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Ligações que só recebem maiúscula quando abrem o nome. */
const LIGACOES = new Set([
  'a', 'ao', 'aos', 'as', 'à', 'às', 'com', 'da', 'das', 'de', 'do', 'dos',
  'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'sem',
])

/** Siglas curtas que perderiam sentido em caixa baixa. */
const SIGLAS = new Set(['uht', 'pet', 'tp', 'ml', 'kg', 'pt', 'cx'])

/** Grafia certa de cada unidade, para o litro não virar "l" solitário. */
const UNIDADES: Record<string, string> = {
  g: 'g',
  kg: 'kg',
  mg: 'mg',
  ml: 'mL',
  l: 'L',
  un: 'un',
}

function palavra(p: string, primeira: boolean): string {
  const baixa = p.toLowerCase()

  if (SIGLAS.has(baixa)) return baixa === 'ml' ? 'mL' : baixa.toUpperCase()
  if (!primeira && LIGACOES.has(baixa)) return baixa

  // Palavra que já vem em caixa alta perde o grito, desde que não seja sigla
  // curta. "NESTLE" vira "Nestle"; "UHT" continua "UHT".
  const gritando = p.length >= 4 && p === p.toUpperCase() && /\p{L}/u.test(p)
  const base = gritando ? baixa : p

  return base.charAt(0).toUpperCase() + base.slice(1)
}

/**
 * Nome de produto pronto para a tela.
 *
 * Junta espaços repetidos, separa o número da unidade colada nele e arruma a
 * caixa das palavras, sem tocar em acentuação nem tentar adivinhar abreviação.
 */
export function nomeDeProduto(nome: string): string {
  return (
    nome
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((p, i) => palavra(p, i === 0))
      .join(' ')
      // Depois da caixa, nunca antes: separada em palavra própria, a unidade
      // entraria na capitalização e "170g" viraria "170 G".
      .replace(
        /(\d)\s*(kg|mg|ml|g|l)\b/gi,
        (_, n, u) => `${n} ${UNIDADES[u.toLowerCase()] ?? u}`,
      )
  )
}

/** Marca com a mesma arrumação do nome. Vazia vira nula, para o layout saber. */
export function marcaDeProduto(marca: string | null): string | null {
  if (!marca?.trim()) return null
  return nomeDeProduto(marca)
}

function numero(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, ''))
    .replace('.', ',')
    .replace(/,$/, '')
}

/**
 * Quantidade da embalagem como se lê no rótulo.
 *
 * Sobe de escala quando o número fica grande: um pacote de "1000 g" é um
 * pacote de 1 kg, e é assim que a pessoa procura na prateleira. A conversão é
 * só de exibição; o dado guardado continua na unidade original, que é o que
 * `quantidade_base` usa para comparar preço por quilo.
 */
export function quantidadeEmTexto(
  quantidade: number,
  unidade: string,
): string {
  const u = unidade.toLowerCase()

  if (u === 'un') return `${numero(quantidade)} ${quantidade === 1 ? 'unidade' : 'unidades'}`
  if (u === 'g' && quantidade >= 1000) return `${numero(quantidade / 1000)} kg`
  if (u === 'ml' && quantidade >= 1000) return `${numero(quantidade / 1000)} L`

  return `${numero(quantidade)} ${UNIDADES[u] ?? unidade}`
}

/** Linha de apoio abaixo do nome: marca e tamanho, o que houver. */
export function descricaoDoProduto(p: {
  marca: string | null
  quantidade: number
  unidade_medida: string
}): string {
  return [marcaDeProduto(p.marca), quantidadeEmTexto(p.quantidade, p.unidade_medida)]
    .filter(Boolean)
    .join(' · ')
}
