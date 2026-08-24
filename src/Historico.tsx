import { useEffect, useState } from 'react'
import { historico } from './lib/consulta'
import { precoPorUnidade, unidadeDeComparacao, type Produto } from './lib/produto'

type Ponto = Awaited<ReturnType<typeof historico>>[number]

const real = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

const data = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/**
 * Histórico de um produto num mercado (RF-15).
 *
 * Vem de `preco_publico`, que já aplica a RD-04: registro superado no mesmo dia
 * não aparece. O que se vê é o preço que valeu em cada dia, não cada tentativa
 * de digitar.
 */
export function Historico({
  produto,
  mercadoId,
  mercadoNome,
}: {
  produto: Produto
  mercadoId: string
  mercadoNome: string
}) {
  const [pontos, setPontos] = useState<Ponto[] | null>(null)

  useEffect(() => {
    let ativo = true
    void historico(produto.id, mercadoId).then((r) => {
      if (ativo) setPontos(r)
    })
    return () => {
      ativo = false
    }
  }, [produto.id, mercadoId])

  if (pontos === null) return <p className="text-sm text-tinta-fraca">Carregando…</p>

  if (pontos.length <= 1) {
    return (
      <p className="text-sm text-tinta-suave">
        Só há um preço registrado aqui. O histórico aparece quando o mesmo
        produto for cadastrado outras vezes neste mercado.
      </p>
    )
  }

  const valores = pontos.map((p) => p.valor)
  const menor = Math.min(...valores)
  const maior = Math.max(...valores)
  const faixa = maior - menor

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-tinta-suave">
        Histórico em {mercadoNome} · de {real(menor)} a {real(maior)}
      </p>

      <ol className="flex flex-col gap-1">
        {pontos.map((p) => {
          // Barra proporcional dentro da faixa observada. Não é gráfico: é
          // referência visual para enxergar variação sem ler número por número.
          const largura = faixa === 0 ? 100 : 15 + ((p.valor - menor) / faixa) * 85
          const porUnidade = precoPorUnidade(produto, p.valor)

          return (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 tabular-nums text-tinta-fraca">
                {data(p.observadoEm)}
              </span>
              <span className="flex h-6 flex-1 items-center">
                <span
                  style={{ width: `${largura}%` }}
                  className={
                    p.tipo === 'promocional'
                      ? 'h-2 rounded-full bg-alerta'
                      : 'h-2 rounded-full bg-marca'
                  }
                />
              </span>
              <span className="shrink-0 tabular-nums text-tinta">
                {real(p.valor)}
              </span>
              {porUnidade !== null && (
                <span className="w-24 shrink-0 text-right tabular-nums text-tinta-fraca">
                  {real(porUnidade)}/{unidadeDeComparacao(produto)}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      <p className="text-xs text-tinta-fraca">
        Barra amarela é promoção. Um preço promocional baixo não significa que o
        produto ficou barato — significa que estava em oferta naquele dia.
      </p>
    </div>
  )
}
