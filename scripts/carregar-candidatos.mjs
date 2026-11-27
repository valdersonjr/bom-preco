/**
 * Leva para o banco o catálogo de mercados baixado do OpenStreetMap (RF-54).
 *
 *   export VITE_SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...   # do CLI, nunca renderizada
 *   node scripts/carregar-candidatos.mjs dados/mercados-osm.csv
 *
 * Reexecutar é seguro: casa pelo identificador do OpenStreetMap e atualiza.
 *
 * Faz também a ponte com os mercados que já existiam antes do catálogo. Um
 * mercado cadastrado à mão que fica a menos de 50 metros de um candidato é o
 * mesmo lugar: ele recebe o identificador do candidato, e com isso o banco
 * passa a recusar a segunda linha. Só com coordenada dá para saber — os que o
 * mantenedor cadastrou sem medir ficam como estão.
 *
 * Dados © colaboradores do OpenStreetMap, sob licença ODbL.
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
const candidatos = linhas.map((l) => {
  const o = Object.fromEntries(cab.map((n, i) => [n, l[i]]))
  return { ...o, latitude: Number(o.latitude), longitude: Number(o.longitude) }
})

const sb = createClient(url, chave, { auth: { persistSession: false } })

for (let i = 0; i < candidatos.length; i += 500) {
  const { error } = await sb
    .from('mercado_candidato')
    .upsert(candidatos.slice(i, i + 500), { onConflict: 'osm_id' })
  if (error) { console.error(error.message); process.exit(1) }
}
console.log(`candidatos: ${candidatos.length}`)

function metros(aLat, aLon, bLat, bLon) {
  const R = 6_371_000
  const rad = (g) => (g * Math.PI) / 180
  const h =
    Math.sin(rad(bLat - aLat) / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLon - aLon) / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const { data: antigos, error } = await sb
  .from('mercado')
  .select('id, nome, latitude, longitude')
  .is('osm_id', null)
  .not('latitude', 'is', null)
if (error) { console.error(error.message); process.exit(1) }

const usados = new Set()
for (const m of antigos) {
  const perto = candidatos
    .filter((c) => !usados.has(c.osm_id))
    .map((c) => ({ c, d: metros(m.latitude, m.longitude, c.latitude, c.longitude) }))
    .sort((a, b) => a.d - b.d)[0]
  if (!perto || perto.d > 50) continue

  const { error: aoLigar } = await sb
    .from('mercado')
    .update({ osm_id: perto.c.osm_id })
    .eq('id', m.id)
  if (aoLigar) { console.error(`${m.nome}: ${aoLigar.message}`); continue }
  usados.add(perto.c.osm_id)
  console.log(`ligado: "${m.nome}" = "${perto.c.nome}" (${Math.round(perto.d)} m)`)
}
