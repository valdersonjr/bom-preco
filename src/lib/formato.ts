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
