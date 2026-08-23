/**
 * Carrega produtos na tabela `produto` a partir de um CSV.
 *
 * Serve para os dois catálogos: o recorte do Open Food Facts, que vem com
 * `gtin`, e o catálogo curado de itens sem código de barras (RD-08), que não
 * vem. A origem é lida do CSV quando existe a coluna, senão assume `dump`.
 *
 * Precisa da chave de serviço porque `origem = 'dump'` só é aceito pela
 * política do mantenedor. Ela é lida do ambiente e nunca é escrita em lugar
 * nenhum — não vai para o repositório, não aparece em log.
 *
 *   export SUPABASE_SERVICE_ROLE_KEY='...'
 *   node scripts/carregar-produtos.mjs caminho/para/produtos-br.csv
 *
 * Reexecutar é seguro: conflito de GTIN é ignorado, não duplicado.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
const arquivo = process.argv[2]

if (!url || !chave || !arquivo) {
  console.error(
    'Uso: VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ' +
      'node scripts/carregar-produtos.mjs <arquivo.csv>',
  )
  process.exit(1)
}

/** CSV do DuckDB: aspas duplas apenas onde necessário, escape por duplicação. */
function lerCsv(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let dentroDeAspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"'
          i++
        } else dentroDeAspas = false
      } else campo += c
    } else if (c === '"') dentroDeAspas = true
    else if (c === ',') {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else if (c !== '\r') campo += c
  }
  if (campo || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }
  return linhas
}

const linhas = lerCsv(readFileSync(arquivo, 'utf8'))
const cabecalho = linhas.shift()
const col = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))

const produtos = linhas
  .filter((l) => l.length === cabecalho.length && l[col.nome])
  .map((l) => ({
    gtin: col.gtin === undefined ? null : l[col.gtin] || null,
    nome: l[col.nome],
    marca: col.marca === undefined ? null : l[col.marca] || null,
    quantidade: Number(l[col.quantidade]),
    unidade_medida: l[col.unidade_medida],
    origem: col.origem === undefined ? 'dump' : l[col.origem],
  }))

console.log(`lidos: ${produtos.length}`)

const sb = createClient(url, chave, { auth: { persistSession: false } })
const LOTE = 500
let inseridos = 0

for (let i = 0; i < produtos.length; i += LOTE) {
  const lote = produtos.slice(i, i + LOTE)
  const comGtin = lote[0].gtin !== null
  const { error } = comGtin
    ? await sb.from('produto').upsert(lote, { onConflict: 'gtin', ignoreDuplicates: true })
    : await sb.from('produto').insert(lote)

  if (error) {
    console.error(`falhou no lote a partir de ${i}: ${error.message}`)
    process.exit(1)
  }
  inseridos += lote.length
  process.stdout.write(`\rcarregados: ${inseridos}/${produtos.length}`)
}

console.log('\nconcluído')
