/**
 * Semeia o banco com dados de demonstração.
 *
 * Isto **não é dado real**. Serve para ver o app cheio: comparação entre
 * mercados, idade de preço, histórico, promoção, roteiro de compra e mapa.
 *
 * Duas decisões deliberadas:
 *
 * **Os mercados de Brasília têm nome fictício.** A geografia é real — as
 * coordenadas caem nas superquadras do Plano Piloto — mas inventar preço em
 * nome de uma empresa que existe, num app publicamente acessível, é fabricar
 * informação comercial sobre terceiro. Os de Goianésia já estavam no banco e
 * são reais; ali o que é falso é só o preço.
 *
 * **Os preços não têm autor.** `usuario_id` fica nulo, que no modelo significa
 * "autoria anonimizada" (RD-11). Evita criar conta de mentira, e deixa todo o
 * lote identificável numa cláusula só na hora de apagar.
 *
 * Para remover tudo:  node scripts/limpar-demonstracao.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.VITE_SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !chave) {
  console.error('faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, chave, { auth: { persistSession: false } })

// ─────────────────────────────────────────────────────────────────────────────
// Aleatoriedade reproduzível: rodar de novo dá o mesmo resultado, o que torna
// o que se vê na tela conferível contra o que o script diz ter gerado.
// ─────────────────────────────────────────────────────────────────────────────
let semente = 20260826
const sorte = () => {
  semente = (semente * 1103515245 + 12345) & 0x7fffffff
  return semente / 0x7fffffff
}
const entre = (a, b) => a + sorte() * (b - a)
const inteiro = (a, b) => Math.floor(entre(a, b + 1))

// ─────────────────────────────────────────────────────────────────────────────
// Brasília — Plano Piloto
//
// O Eixo Rodoviário corre norte-sul curvando para oeste nas pontas. Interpolo
// entre a Rodoviária e as extremidades das duas asas, e desloco para leste ou
// oeste conforme a quadra: 100 e 300 a oeste do Eixo, 200 e 400 a leste.
// ─────────────────────────────────────────────────────────────────────────────
const CENTRO = { lat: -15.794, lon: -47.8828 }
const PONTA_SUL = { lat: -15.838, lon: -47.92 }
const PONTA_NORTE = { lat: -15.729, lon: -47.877 }

function pontoNaAsa(asa, quadra, faixa) {
  // Quadra 102 fica junto ao centro; 316 (sul) e 416 (norte), na ponta.
  const maximo = asa === 'sul' ? 316 : 416
  const t = Math.min((quadra - 102) / (maximo - 102), 1)
  const ponta = asa === 'sul' ? PONTA_SUL : PONTA_NORTE
  const lat = CENTRO.lat + (ponta.lat - CENTRO.lat) * t
  const lon = CENTRO.lon + (ponta.lon - CENTRO.lon) * t
  // Deslocamento perpendicular: oeste é longitude menor.
  const desvio = faixa === 'oeste' ? -0.0075 : 0.0068
  return { lat: +(lat).toFixed(6), lon: +(lon + desvio).toFixed(6) }
}

const MERCADOS_BRASILIA = [
  ['Mercado da 108 Sul', 'sul', 108, 'oeste', 'SQS 108, Bloco A — Asa Sul'],
  ['Empório Sudoeste do Eixo', 'sul', 112, 'leste', 'SQS 212, Bloco C — Asa Sul'],
  ['Superquadra Alimentos', 'sul', 204, 'leste', 'SQS 204, Bloco B — Asa Sul'],
  ['Mercearia do Bloco', 'sul', 208, 'oeste', 'SQS 308, Bloco D — Asa Sul'],
  ['Central de Abastecimento Sul', 'sul', 302, 'oeste', 'CLS 302, Bloco A — Asa Sul'],
  ['Mercado Beira-Lago', 'sul', 308, 'leste', 'CLS 408, Bloco B — Asa Sul'],
  ['Feira Coberta da 314', 'sul', 314, 'oeste', 'CLS 314, Bloco C — Asa Sul'],
  ['Atacado W3 Sul', 'sul', 310, 'oeste', 'SCLRS 710, Bloco A — Asa Sul'],
  ['Armazém da Candanga', 'sul', 206, 'leste', 'CLS 406, Bloco D — Asa Sul'],
  ['Mercado da 106 Norte', 'norte', 106, 'oeste', 'CLN 106, Bloco A — Asa Norte'],
  ['Comercial da 210', 'norte', 210, 'leste', 'CLN 410, Bloco B — Asa Norte'],
  ['Supermercado Pilotis', 'norte', 208, 'oeste', 'CLN 308, Bloco C — Asa Norte'],
  ['Mercado do Eixinho Norte', 'norte', 212, 'leste', 'CLN 212, Bloco D — Asa Norte'],
  ['Entreposto da 410 Norte', 'norte', 410, 'oeste', 'CLN 410, Bloco A — Asa Norte'],
  ['Mercado Vila Planalto', 'norte', 306, 'leste', 'CLN 406, Bloco B — Asa Norte'],
  ['Atacado W3 Norte', 'norte', 312, 'oeste', 'SCLRN 712, Bloco A — Asa Norte'],
  ['Mercadinho da 404', 'norte', 404, 'leste', 'CLN 404, Bloco C — Asa Norte'],
  ['Casa do Cerrado', 'norte', 114, 'oeste', 'CLN 314, Bloco D — Asa Norte'],
]

// ─────────────────────────────────────────────────────────────────────────────
// A cesta. Termo de busca → preço típico em reais.
// ─────────────────────────────────────────────────────────────────────────────
const CESTA = [
  ['arroz', 27], ['feijão', 9.5], ['açúcar', 5.2], ['café', 22],
  ['óleo de soja', 8.4], ['macarrão', 5.6], ['farinha de trigo', 6.3],
  ['leite', 5.9], ['manteiga', 14.5], ['margarina', 9.2], ['queijo', 24],
  ['presunto', 13], ['iogurte', 6.8], ['requeijão', 9.4], ['achocolatado', 12.5],
  ['biscoito', 5.4], ['refrigerante', 9.8], ['suco', 7.2], ['água', 3.1],
  ['cerveja', 4.6], ['sabão em pó', 17], ['amaciante', 13.4],
  ['detergente', 3.2], ['papel higiênico', 21], ['sabonete', 3.4],
  ['creme dental', 7.1], ['shampoo', 16.5], ['desodorante', 15.9],
  ['molho de tomate', 4.3], ['extrato de tomate', 5.1], ['sal', 3.4],
  ['vinagre', 4.2], ['azeite', 38], ['maionese', 11.2], ['atum', 9.7],
  ['sardinha', 7.3], ['salsicha', 12.4], ['linguiça', 21], ['mortadela', 15],
  ['gelatina', 3.3], ['chocolate', 8.9], ['aveia', 8.1], ['mel', 22],
  ['fralda', 46], ['papel toalha', 11.6], ['esponja', 4.1],
  ['água sanitária', 5.7], ['desinfetante', 7.4], ['inseticida', 16.8],
  ['leite condensado', 7.9],
]

async function resolverCesta() {
  const escolhidos = []

  // Hortifruti, açougue e padaria: o catálogo curado inteiro entra.
  const { data: semCodigo } = await sb
    .from('produto')
    .select('id, nome, unidade_medida')
    .is('gtin', null)
  for (const p of semCodigo ?? []) {
    escolhidos.push({ id: p.id, nome: p.nome, base: precoDeHortifruti(p.nome) })
  }

  // Industrializados: até três produtos reais por termo da cesta.
  //
  // Casa pelo *começo* do nome, não por conter o termo. `%arroz%` traz
  // "Al. Cães Dog Chow 15kg AD.+7 FGO E Arroz", que então herdaria o preço de
  // um pacote de arroz — dado falso é aceitável numa demonstração, dado
  // absurdo não, porque some a diferença entre o app estar certo e errado.
  for (const [termo, base] of CESTA) {
    const { data: comeca } = await sb
      .from('produto')
      .select('id, nome')
      .not('gtin', 'is', null)
      .ilike('nome', `${termo}%`)
      .order('nome')
      .limit(3)

    let candidatos = comeca ?? []
    if (candidatos.length === 0) {
      const { data: contem } = await sb
        .from('produto')
        .select('id, nome')
        .not('gtin', 'is', null)
        .ilike('nome', `%${termo}%`)
        .order('nome')
        .limit(12)
      candidatos = (contem ?? []).filter(aceitavel).slice(0, 2)
    }

    for (const p of candidatos) {
      if (!escolhidos.some((e) => e.id === p.id)) {
        escolhidos.push({ id: p.id, nome: p.nome, base })
      }
    }
  }
  return escolhidos
}

/** Descarta o que claramente não é o item da cesta. */
function aceitavel(p) {
  const n = p.nome.toLowerCase()
  if (n.length > 48) return false
  return !/(c[ãa]es|c[ãa]o|gato|pet|ra[çc][ãa]o|filhote|adulto\b)/.test(n)
}

/** Preço por quilo do que se vende a granel, por faixa de gênero. */
function precoDeHortifruti(nome) {
  const n = nome.toLowerCase()
  if (/(picanha|alcatra|contrafil|file|filé|maminha)/.test(n)) return entre(48, 75)
  if (/(carne|costela|acém|patinho|coxão|músculo)/.test(n)) return entre(28, 44)
  if (/(frango|coxa|sobrecoxa|asa|peito)/.test(n)) return entre(11, 19)
  if (/(peixe|tilápia|pescada|salmão)/.test(n)) return entre(26, 58)
  if (/(pão|broa|bolo|rosca|sonho)/.test(n)) return entre(9, 18)
  if (/(queijo|muçarela|mussarela)/.test(n)) return entre(32, 52)
  if (/(maçã|uva|morango|pêra|pera|ameixa|kiwi)/.test(n)) return entre(9, 18)
  if (/(banana|laranja|mamão|melancia|abacaxi|melão)/.test(n)) return entre(3.5, 8)
  return entre(3.5, 11) // legume e verdura em geral
}

async function main() {
  // ── 1. mercados de Brasília ──────────────────────────────────────────────
  const { data: jaExistem } = await sb
    .from('mercado')
    .select('id')
    .eq('cidade', 'Brasília')

  if ((jaExistem ?? []).length === 0) {
    const linhas = MERCADOS_BRASILIA.map(([nome, asa, quadra, faixa, endereco]) => {
      const { lat, lon } = pontoNaAsa(asa, quadra, faixa)
      return {
        nome,
        endereco,
        cidade: 'Brasília',
        localizacao: `SRID=4326;POINT(${lon} ${lat})`,
      }
    })
    const { error } = await sb.from('mercado').insert(linhas)
    if (error) throw new Error(`mercados: ${error.message}`)
    console.log(`mercados de Brasília criados: ${linhas.length}`)
  } else {
    console.log(`mercados de Brasília já existiam: ${jaExistem.length}`)
  }

  // ── 2. a cesta ────────────────────────────────────────────────────────────
  const cesta = await resolverCesta()
  console.log(`produtos na cesta: ${cesta.length}`)

  const { data: mercados } = await sb
    .from('mercado')
    .select('id, nome, cidade')
    .order('cidade')
  console.log(`mercados no total: ${mercados.length}`)

  // Perfil de cada loja: quão cara e quão sortida. Estável por mercado, para
  // que a comparação entre lojas tenha sentido em vez de ser ruído puro.
  const perfil = new Map(
    mercados.map((m) => [
      m.id,
      {
        cidade: m.cidade,
        fator: entre(0.88, 1.14) * (m.cidade === 'Brasília' ? 1.16 : 1),
        cobertura: entre(0.45, 0.92),
      },
    ]),
  )

  // ── 3. preços ─────────────────────────────────────────────────────────────
  const agora = Date.now()
  const DIA = 86_400_000
  const registros = []

  for (const produto of cesta) {
    for (const m of mercados) {
      const p = perfil.get(m.id)
      if (sorte() > p.cobertura) continue

      // Uma a quatro observações nos últimos 75 dias, a mais recente primeiro.
      const quantas = inteiro(1, 4)
      const dias = Array.from({ length: quantas }, () => inteiro(0, 75)).sort(
        (a, b) => a - b,
      )

      for (const [i, atras] of dias.entries()) {
        // Deriva: preço mais antigo tende a ser um pouco menor.
        const deriva = 1 + (atras / 75) * entre(-0.09, -0.01)
        const ruido = entre(0.97, 1.03)
        const promocional = sorte() < 0.12
        const valor = produto.base * p.fator * deriva * ruido * (promocional ? entre(0.68, 0.86) : 1)

        registros.push({
          id: randomUUID(),
          produto_id: produto.id,
          mercado_id: m.id,
          usuario_id: null,
          valor: Math.max(0.5, +valor.toFixed(2)),
          tipo: promocional ? 'promocional' : 'tabela',
          local_conferido: sorte() < 0.42,
          // Hora comercial, para o histórico não parecer gerado às três da manhã.
          observado_em: new Date(
            agora - atras * DIA - inteiro(0, 9) * 3_600_000,
          ).toISOString(),
          _recente: i === 0 && atras < 12,
        })
      }
    }
  }

  console.log(`registros a inserir: ${registros.length}`)

  const LOTE = 500
  for (let i = 0; i < registros.length; i += LOTE) {
    const fatia = registros.slice(i, i + LOTE).map(({ _recente, ...r }) => r)
    const { error } = await sb.from('registro_preco').insert(fatia)
    if (error) throw new Error(`preços em ${i}: ${error.message}`)
    process.stdout.write(`\r  inseridos ${Math.min(i + LOTE, registros.length)}/${registros.length}`)
  }
  console.log()

  // ── 4. confirmações ───────────────────────────────────────────────────────
  // Só em preço recente: confirmar é dizer "ainda está assim", e ninguém
  // confirma o que viu há dois meses.
  const confirmaveis = registros.filter((r) => r._recente && sorte() < 0.3)
  const confirmacoes = confirmaveis.flatMap((r) =>
    Array.from({ length: inteiro(1, 3) }, (_, k) => ({
      registro_id: r.id,
      usuario_id: null,
      confirmado_em: new Date(
        Date.parse(r.observado_em) + (k + 1) * inteiro(4, 40) * 3_600_000,
      ).toISOString(),
    })),
  ).filter((c) => Date.parse(c.confirmado_em) < agora)

  for (let i = 0; i < confirmacoes.length; i += LOTE) {
    const { error } = await sb
      .from('confirmacao')
      .insert(confirmacoes.slice(i, i + LOTE))
    if (error) throw new Error(`confirmações em ${i}: ${error.message}`)
  }
  console.log(`confirmações: ${confirmacoes.length}`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
