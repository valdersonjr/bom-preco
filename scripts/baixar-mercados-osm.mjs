/**
 * Baixa do OpenStreetMap os mercados das cidades atendidas e grava o CSV que
 * `carregar-candidatos.mjs` leva para o banco.
 *
 * São dois passos, e não um, de propósito: o CSV fica no repositório, então o
 * que entra no catálogo é revisável num diff antes de entrar — e recarregar o
 * banco não depende de o serviço público de consulta estar de pé no dia.
 *
 *   node scripts/baixar-mercados-osm.mjs > dados/mercados-osm.csv
 *
 * Para atender cidade nova, acrescente uma linha em CIDADES e rode de novo.
 *
 * Dados © colaboradores do OpenStreetMap, sob licença ODbL. A atribuição
 * aparece na aba Conta do app.
 */

/**
 * `area` usa o limite administrativo, que é exato; `raio` é para quando o nome
 * da cidade se repete pelo mundo e a área traria as homônimas juntas.
 */
const CIDADES = [
  { cidade: 'Goianésia', filtro: '(around:9000,-15.3175,-49.1170)' },
  { cidade: 'Brasília', area: 'area["ISO3166-2"="BR-DF"]->.a;', filtro: '(area.a)' },
  { cidade: 'Valladolid', filtro: '(around:9000,41.6523,-4.7245)' },
]

/**
 * O que conta como mercado. `convenience` entra porque é como o OpenStreetMap
 * costuma marcar mercearia e mercadinho de bairro; padaria e farmácia ficam
 * fora, porque o app compara compra de supermercado.
 */
const TIPOS = 'supermarket|convenience|wholesale|greengrocer|butcher|grocery'

const SERVIDORES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

async function consultar(consulta) {
  let ultimo = ''
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const servidor = SERVIDORES[tentativa % SERVIDORES.length]
    try {
      const r = await fetch(servidor, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'importador-de-mercados/1.0',
        },
        body: 'data=' + encodeURIComponent(consulta),
      })
      if (r.ok) return (await r.json()).elements
      ultimo = `${servidor}: ${r.status}`
    } catch (e) {
      ultimo = `${servidor}: ${e.message}`
    }
    // Servidor público e compartilhado: quando está cheio, espera-se a vez.
    await new Promise((ok) => setTimeout(ok, 5000 * (tentativa + 1)))
  }
  throw new Error(`OpenStreetMap não respondeu (${ultimo})`)
}

/**
 * Nome todo em minúsculas é descuido de quem mapeou, não grafia da loja:
 * "supermercado brasil 3" vira "Supermercado Brasil 3". Nome que já tem
 * maiúscula fica como está — "Dia", "ALDI" e "BonÀrea" sabem o que são.
 */
function arrumarNome(nome) {
  if (/\p{Lu}/u.test(nome)) return nome
  return nome
    .split(' ')
    .map((p, i) => (p.length > 2 || i === 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

const csv = (v) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)

console.log('osm_id,tipo,nome,endereco,latitude,longitude,cidade')

for (const { cidade, area = '', filtro } of CIDADES) {
  const elementos = await consultar(
    `[out:json][timeout:120];${area}nwr["shop"~"^(${TIPOS})$"]["name"]${filtro};out center tags;`,
  )

  let quantos = 0
  for (const e of elementos) {
    const t = e.tags ?? {}
    const lat = e.lat ?? e.center?.lat
    const lon = e.lon ?? e.center?.lon
    const nome = t.name?.trim() && arrumarNome(t.name.trim())
    if (!nome || lat == null || lon == null) continue

    const rua = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(', ')
    const endereco = [rua, t['addr:suburb']].filter(Boolean).join(' — ')

    console.log(
      [`${e.type}/${e.id}`, t.shop, nome, endereco, lat.toFixed(7), lon.toFixed(7), cidade]
        .map((v) => csv(String(v)))
        .join(','),
    )
    quantos++
  }
  console.error(`${cidade}: ${quantos}`)
}
