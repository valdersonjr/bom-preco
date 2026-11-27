import { describe, expect, it } from 'vitest'
import { maisRecentePor } from './consulta'
import { idadeEmTexto } from './formato'
import {
  escolherOpcoes,
  normalizarTermo,
  ordenarCostumes,
  type Candidato,
} from './lista'
import type { Mercado } from './mercado'
import type { Produto } from './produto'
import { lerValor, longeDoEsperado } from './registro'

const dia = (n: number) => new Date(Date.UTC(2026, 10, n, 12))
const AGORA = dia(27).getTime()

describe('maisRecentePor (RD-04)', () => {
  it('fica com a observação mais recente de cada chave, não com o menor valor', () => {
    const vigentes = maisRecentePor(
      [
        { loja: 'a', valor: 4.5, observadoEm: dia(5) },
        { loja: 'a', valor: 6.0, observadoEm: dia(20) },
        { loja: 'b', valor: 5.0, observadoEm: dia(10) },
      ],
      (p) => p.loja,
    )
    expect(vigentes).toHaveLength(2)
    expect(vigentes.find((p) => p.loja === 'a')?.valor).toBe(6.0)
  })

  it('devolve vazio para lista vazia', () => {
    expect(maisRecentePor([], () => 'x')).toEqual([])
  })
})

describe('lerValor', () => {
  it('aceita vírgula e ponto', () => {
    expect(lerValor('12,90')).toBe(12.9)
    expect(lerValor('12.90')).toBe(12.9)
    expect(lerValor(' 7 ')).toBe(7)
  })

  it('recusa zero, negativo, três casas e texto', () => {
    expect(lerValor('0')).toBeNull()
    expect(lerValor('-3')).toBeNull()
    expect(lerValor('1,999')).toBeNull()
    expect(lerValor('doze')).toBeNull()
    expect(lerValor('')).toBeNull()
  })
})

describe('longeDoEsperado', () => {
  it('acusa a vírgula esquecida, para cima e para baixo', () => {
    expect(longeDoEsperado(1290, 12.9)).toBe(true)
    expect(longeDoEsperado(1.29, 12.9)).toBe(true)
  })

  it('deixa passar promoção forte e reajuste grande', () => {
    expect(longeDoEsperado(6.45, 12.9)).toBe(false)
    expect(longeDoEsperado(25, 12.9)).toBe(false)
    expect(longeDoEsperado(38.7, 12.9)).toBe(false)
  })

  it('não acusa nada sem referência', () => {
    expect(longeDoEsperado(1290, null)).toBe(false)
    expect(longeDoEsperado(1290, 0)).toBe(false)
  })
})

describe('idadeEmTexto (RF-13)', () => {
  it('conta em dias até dois meses, e em meses depois', () => {
    expect(idadeEmTexto(0)).toBe('visto hoje')
    expect(idadeEmTexto(1)).toBe('visto ontem')
    expect(idadeEmTexto(30)).toBe('visto há 30 dias')
    expect(idadeEmTexto(60)).toBe('visto há 60 dias')
    expect(idadeEmTexto(95)).toBe('visto há 3 meses')
  })
})

describe('normalizarTermo (RF-52)', () => {
  it('mantém o acento, tira pontuação e caixa', () => {
    expect(normalizarTermo('  Feijão-Carioca!! ')).toBe('feijão carioca')
    expect(normalizarTermo('ARROZ   5kg')).toBe('arroz 5kg')
  })

  it('fica vazio quando só há pontuação', () => {
    expect(normalizarTermo(' .. ')).toBe('')
  })
})

describe('escolherOpcoes (RD-16)', () => {
  const mercado = (id: string): Mercado => ({
    id,
    nome: `Mercado ${id}`,
    endereco: '',
    latitude: null,
    longitude: null,
    rede: null,
    cidade: 'Goianésia',
    osmId: null,
    situacao: 'confirmado',
  })

  const produto = (id: string, kg: number, dimensao = 'massa'): Produto => ({
    id,
    gtin: null,
    nome: `Arroz ${id}`,
    marca: null,
    quantidade: kg,
    unidade_medida: dimensao === 'massa' ? 'kg' : 'L',
    quantidade_base: kg,
    dimensao,
  })

  const candidato = (
    p: Produto,
    m: Mercado,
    valor: number,
    observado: Date,
  ): Candidato => ({
    produto: p,
    mercado: m,
    valor,
    porUnidade: valor / (p.quantidade_base ?? 1),
    vistoEm: observado,
    observadoEm: observado,
  })

  const a = mercado('a')
  const b = mercado('b')
  const um = produto('1kg', 1)
  const cinco = produto('5kg', 5)

  it('compara por unidade: o pacote de 5 kg vence o de 1 kg mais barato na etiqueta', () => {
    const opcoes = escolherOpcoes(
      [candidato(um, a, 6, dia(20)), candidato(cinco, a, 25, dia(20))],
      AGORA,
    )
    expect(opcoes.map((o) => o.produto.id)).toEqual(['5kg', '1kg'])
    expect(opcoes[0].porUnidade).toBe(5)
  })

  it('usa o preço vigente de cada produto em cada mercado, não o menor já visto', () => {
    const opcoes = escolherOpcoes(
      [
        candidato(um, a, 3, dia(2)),
        candidato(um, a, 7, dia(25)),
        candidato(um, b, 6, dia(24)),
      ],
      AGORA,
    )
    expect(opcoes.map((o) => [o.mercado.id, o.valor])).toEqual([
      ['b', 6],
      ['a', 7],
    ])
  })

  it('fica numa dimensão só, a que mais aparece (RD-05)', () => {
    const bebida = produto('bebida', 1, 'volume')
    const opcoes = escolherOpcoes(
      [
        candidato(bebida, a, 1, dia(20)),
        candidato(um, a, 6, dia(20)),
        candidato(cinco, b, 25, dia(20)),
      ],
      AGORA,
    )
    expect(opcoes.every((o) => o.produto.dimensao === 'massa')).toBe(true)
    expect(opcoes).toHaveLength(2)
  })

  it('calcula a idade a partir do instante recebido', () => {
    const [opcao] = escolherOpcoes([candidato(um, a, 6, dia(20))], AGORA)
    expect(opcao.idadeEmDias).toBe(7)
  })

  it('devolve vazio sem candidatos', () => {
    expect(escolherOpcoes([], AGORA)).toEqual([])
  })
})

describe('ordenarCostumes (RF-53)', () => {
  const p = (id: string): Produto => ({
    id,
    gtin: null,
    nome: id,
    marca: null,
    quantidade: 1,
    unidade_medida: 'un',
    quantidade_base: 1,
    dimensao: 'contagem',
  })

  it('põe o mais frequente primeiro, e o mais recente desempata', () => {
    const ordem = ordenarCostumes([
      { produto: p('cafe'), termo: null, em: dia(1) },
      { produto: p('leite'), termo: null, em: dia(1) },
      { produto: p('leite'), termo: null, em: dia(8) },
      { produto: p('pao'), termo: null, em: dia(20) },
    ])
    expect(ordem.map((c) => c.chave)).toEqual(['p:leite', 'p:pao', 'p:cafe'])
    expect(ordem[0].vezes).toBe(2)
    expect(ordem[0].ultimaEm).toEqual(dia(8))
  })

  it('trata o item de qualquer marca pelo termo, separado do produto', () => {
    const ordem = ordenarCostumes([
      { produto: null, termo: 'arroz', em: dia(1) },
      { produto: null, termo: 'arroz', em: dia(8) },
      { produto: p('arroz'), termo: null, em: dia(9) },
    ])
    expect(ordem.map((c) => c.chave)).toEqual(['t:arroz', 'p:arroz'])
    expect(ordem[0].produto).toBeNull()
  })
})
