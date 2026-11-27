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

/**
 * A idade do preço, em palavras.
 *
 * Este texto não conhece a fronteira dos trinta dias, e é isso que conserta o
 * defeito. Antes ela estava escrita duas vezes: o filtro tratava trinta dias
 * como recente, porque RF-16 diz "mais de 30", e aqui `dias < 30` tratava como
 * velho. O preço de exatamente trinta dias aparecia entre os atuais anunciando
 * ter mais de um mês, e chegou a ser o mais barato da lista.
 *
 * Duas cópias de uma regra sempre acabam discordando. Agora só o filtro decide
 * o que é recente; aqui só se conta o tempo.
 *
 * Conta em dias até dois meses, e não até trinta: quem abriu a seção dos
 * vencidos quer saber se o preço é de trinta e cinco dias ou de seis meses, e
 * "mais de um mês" calava as duas coisas.
 */
export function idadeEmTexto(dias: number): string {
  if (dias === 0) return 'visto hoje'
  if (dias === 1) return 'visto ontem'
  if (dias <= 60) return `visto há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return `visto há ${meses} meses`
}
