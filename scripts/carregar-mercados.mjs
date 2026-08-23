/**
 * Carrega o catálogo de mercados (RD-10) a partir de um CSV.
 *
 * Mercado é metade da chave de um registro de preço: duplicá-lo quebra a
 * comparação do mesmo jeito que duplicar produto. Por isso só o mantenedor
 * cadastra, e isso exige a chave de serviço.
 *
 *   export VITE_SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY='...'   # do CLI, nunca renderizada
 *   node scripts/carregar-mercados.mjs dados/mercados.csv
 *
 * Reexecutar é seguro: casa por nome e atualiza em vez de duplicar.
 *
 * Dados de mercado vindos do OpenStreetMap, sob licença ODbL.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
const arquivo = process.argv[2]

if (!url || !chave || !arquivo) {
  console.error('Faltam VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou o arquivo.')
  process.exit(1)
}

function lerCsv(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++ } else aspas = false
      } else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') { linha.push(campo); campo = '' }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = '' }
    else if (c !== '\r') campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas.filter((l) => l.some((c) => c !== ''))
}

const linhas = lerCsv(readFileSync(arquivo, 'utf8'))
const cab = linhas.shift()
const col = Object.fromEntries(cab.map((n, i) => [n, i]))

const sb = createClient(url, chave, { auth: { persistSession: false } })

// Redes primeiro: o mercado aponta para elas.
const nomesDeRede = [...new Set(linhas.map((l) => l[col.rede]).filter(Boolean))]
const idDaRede = {}

for (const nome of nomesDeRede) {
  const { data: existente } = await sb.from('rede').select('id').eq('nome', nome).maybeSingle()
  if (existente) {
    idDaRede[nome] = existente.id
    continue
  }
  const { data, error } = await sb.from('rede').insert({ nome }).select('id').single()
  if (error) { console.error(`rede "${nome}": ${error.message}`); process.exit(1) }
  idDaRede[nome] = data.id
}
console.log(`redes: ${nomesDeRede.length}`)

let criados = 0
let atualizados = 0

for (const l of linhas) {
  const nome = l[col.nome]
  const registro = {
    rede_id: l[col.rede] ? idDaRede[l[col.rede]] : null,
    nome,
    endereco: l[col.endereco],
    // PostGIS espera longitude antes de latitude.
    localizacao: `POINT(${l[col.longitude]} ${l[col.latitude]})`,
  }

  const { data: existente } = await sb.from('mercado').select('id').eq('nome', nome).maybeSingle()

  const { error } = existente
    ? await sb.from('mercado').update(registro).eq('id', existente.id)
    : await sb.from('mercado').insert(registro)

  if (error) { console.error(`mercado "${nome}": ${error.message}`); process.exit(1) }
  if (existente) atualizados++
  else criados++
}

console.log(`mercados: ${criados} criados, ${atualizados} atualizados`)
