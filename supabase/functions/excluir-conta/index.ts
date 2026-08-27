/**
 * Exclui a conta de quem chamou (RF-40, RD-11).
 *
 * É a única operação do sistema que precisa de código no servidor. Apagar de
 * `auth.users` exige a chave de serviço, que ignora toda a RLS e por isso não
 * pode existir no navegador.
 *
 * A função não recebe qual conta apagar: ela extrai a identidade do próprio
 * token de quem chamou. Assim não há como pedir a exclusão da conta alheia.
 *
 * O banco cuida do resto:
 *   perfil e lista       → caem por cascata
 *   preço e confirmação  → autoria vira nula, o dado coletivo permanece
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Sem estes cabeçalhos a função é inalcançável pelo app.
 *
 * O app é servido pela Vercel e a função roda no domínio do Supabase, então
 * toda chamada é de origem cruzada. E ela leva `Authorization` e `apikey`, dois
 * cabeçalhos que obrigam o navegador a mandar antes um `OPTIONS` de sondagem —
 * que a função respondia com 405, porque só conhecia POST. O navegador então
 * bloqueava o POST sem nunca enviá-lo: quem tocava em "Excluir mesmo assim"
 * recebia erro de rede, e o RF-40 não funcionava em lugar nenhum.
 *
 * A origem é liberada para qualquer uma, e isso não afrouxa nada: quem autoriza
 * aqui é o token no cabeçalho, que o navegador não anexa sozinho e que um site
 * de terceiro não consegue ler do armazenamento do app. CORS decide quem pode
 * ler a resposta, não quem pode agir — a autorização continua sendo o Bearer.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const responder = (corpo: string, status: number, tipo = 'text/plain') =>
  new Response(corpo, {
    status,
    headers: { ...CORS, 'Content-Type': `${tipo};charset=UTF-8` },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== 'POST') {
    return responder('Método não permitido', 405)
  }

  const autorizacao = req.headers.get('Authorization')
  if (!autorizacao) {
    return responder('Sem credencial', 401)
  }

  const url = Deno.env.get('SUPABASE_URL')!

  // Cliente com o token de quem chamou, só para descobrir quem é.
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacao } },
  })

  const { data: quem, error: erroDeSessao } = await comoUsuario.auth.getUser()
  if (erroDeSessao || !quem.user) {
    return responder('Sessão inválida', 401)
  }

  // Cliente com privilégio de administração, só para apagar.
  const comoAdmin = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { error } = await comoAdmin.auth.admin.deleteUser(quem.user.id)
  if (error) {
    return responder(`Não consegui excluir: ${error.message}`, 500)
  }

  return responder(JSON.stringify({ excluido: true }), 200, 'application/json')
})
