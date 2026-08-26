/**
 * Formatação de preço em corpo de texto.
 *
 * Quando o número é a resposta da tela, ele vai no componente `Preco`, que tem
 * tamanho e alinhamento próprios. Esta função é para quando ele é contexto:
 * dentro de uma frase, num total, numa linha de metadado.
 *
 * Existe uma vez só porque estava copiada em três arquivos, já divergindo.
 */
export function precoEmTexto(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

/**
 * Distância em metros, escrita como se fala.
 *
 * Abaixo de mil metros, em metros redondos: "320 m" diz mais que "0,3 km" para
 * quem está decidindo se vai a pé. Acima, em quilômetros com uma casa e vírgula
 * decimal, que é como se escreve em português.
 */
export function distanciaEmTexto(metros: number): string {
  // Arredonda antes de comparar com o limite: 999 m arredondado à dezena vira
  // "1000 m", que não é como ninguém escreve.
  const dezenas = Math.round(metros / 10) * 10
  if (dezenas < 1000) return `${dezenas} m`
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`
}
