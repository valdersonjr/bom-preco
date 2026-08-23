import { supabase } from './supabase'

export type Produto = {
  id: string
  gtin: string | null
  nome: string
  marca: string | null
  quantidade: number
  unidade_medida: string
  /** Normalizada pelo banco (RD-06): massa em kg, volume em litro. */
  quantidade_base: number | null
  dimensao: string | null
}

/**
 * Unidade em que o preço por unidade é apresentado.
 *
 * Sempre a normalizada, nunca a da embalagem: "R$ 0,06 por g" não deixa
 * ninguém comparar nada, "R$ 61,25 por kg" deixa. É para isso que a RD-06
 * existe.
 */
export function unidadeDeComparacao(p: Produto): string {
  if (p.dimensao === 'massa') return 'kg'
  if (p.dimensao === 'volume') return 'L'
  return 'un'
}

/** Preço por unidade normalizada, ou nulo quando não há como calcular. */
export function precoPorUnidade(p: Produto, valor: number): number | null {
  const base = p.quantidade_base
  if (!base || base <= 0) return null
  return valor / base
}

type Busca =
  | { achou: true; produto: Produto }
  | { achou: false; motivo: 'desconhecido' | 'offline' | 'erro'; gtin: string }

/** A base pública normaliza massa em grama e volume em mililitro. */
function unidadeDe(texto: string | undefined): 'g' | 'mL' | null {
  if (!texto) return null
  const t = texto.toLowerCase()
  if (/[0-9]\s*(ml|cl|litros?|lt|l)([^a-z]|$)/.test(t)) return 'mL'
  if (/[0-9]\s*(kg|gramas?|gr|g)([^a-z]|$)/.test(t)) return 'g'
  return null
}

/**
 * Procura o produto pelo código de barras (RF-02, RF-03).
 *
 * Primeiro na base local, que é o recorte brasileiro importado do Open Food
 * Facts. Só se não achar, e havendo conexão, consulta a base pública — e o que
 * vier de lá é gravado aqui (RF-42), para o próximo escaneamento não precisar
 * da chamada.
 *
 * A ordem importa: dentro do mercado o sinal é ruim, e consulta externa falha
 * justamente onde o app é usado.
 */
export async function buscarPorGtin(gtin: string): Promise<Busca> {
  const { data: local } = await supabase
    .from('produto')
    .select('id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao')
    .eq('gtin', gtin)
    .maybeSingle()

  if (local) return { achou: true, produto: local }

  if (!navigator.onLine) return { achou: false, motivo: 'offline', gtin }

  const externo = await consultarBasePublica(gtin)
  if (!externo) return { achou: false, motivo: 'desconhecido', gtin }

  const { data: gravado, error } = await supabase
    .from('produto')
    .insert({ ...externo, gtin, origem: 'api' })
    .select('id, gtin, nome, marca, quantidade, unidade_medida, quantidade_base, dimensao')
    .single()

  if (error || !gravado) return { achou: false, motivo: 'erro', gtin }
  return { achou: true, produto: gravado }
}

type Externo = {
  nome: string
  marca: string | null
  quantidade: number
  unidade_medida: 'g' | 'mL'
}

async function consultarBasePublica(gtin: string): Promise<Externo | null> {
  try {
    const resposta = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${gtin}` +
        '?fields=product_name,brands,product_quantity,quantity',
      { headers: { Accept: 'application/json' } },
    )
    if (!resposta.ok) return null

    const corpo = (await resposta.json()) as {
      status?: number
      product?: {
        product_name?: string
        brands?: string
        product_quantity?: string | number
        quantity?: string
      }
    }
    if (corpo.status !== 1 || !corpo.product) return null

    const p = corpo.product
    const nome = p.product_name?.trim()
    const quantidade = Number(p.product_quantity)
    const unidade = unidadeDe(p.quantity)

    // Sem nome ou sem quantidade utilizável o produto não cabe no esquema:
    // `quantidade` e `unidade_medida` são obrigatórias, e inventar um valor
    // estragaria o preço por unidade.
    if (!nome || !Number.isFinite(quantidade) || quantidade <= 0 || !unidade) {
      return null
    }

    return {
      nome,
      marca: p.brands?.trim() || null,
      quantidade,
      unidade_medida: unidade,
    }
  } catch {
    return null
  }
}
