/**
 * O número, sempre do mesmo jeito.
 *
 * Existe como componente porque preço aparece em quatro telas e antes era
 * formatado em quatro lugares, cada um com um tamanho diferente. Num app cuja
 * pergunta é "quanto custa", isso é o mesmo que não ter resposta.
 *
 * Duas decisões tipográficas:
 *
 * **"R$" recua.** Fica menor e em tinta suave. Ninguém precisa ler a moeda —
 * ela é a mesma em todos os preços da tela. O que se compara são os dígitos, e
 * eles ficam com todo o peso.
 *
 * **Os centavos não encolhem.** É a tentação óbvia, e está errada aqui: a
 * diferença entre R$ 4,99 e R$ 4,89 é exatamente o que este app existe para
 * mostrar. Diminuir os centavos esconderia o dado.
 */
export function Preco({
  valor,
  tamanho = 'grande',
  tom = 'tinta',
}: {
  valor: number
  tamanho?: 'grande' | 'medio'
  tom?: 'tinta' | 'marca'
}) {
  const texto = valor.toFixed(2).replace('.', ',')

  return (
    <span
      className={`whitespace-nowrap tabular-nums ${
        tamanho === 'grande' ? 'text-preco' : 'text-preco-menor'
      } ${tom === 'marca' ? 'text-marca-forte' : 'text-tinta'}`}
    >
      <span className="mr-0.5 align-baseline text-sm font-normal text-tinta-suave">
        R$
      </span>
      {texto}
    </span>
  )
}
