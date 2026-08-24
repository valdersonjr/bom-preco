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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 })
  }

  const autorizacao = req.headers.get('Authorization')
  if (!autorizacao) {
    return new Response('Sem credencial', { status: 401 })
  }

  const url = Deno.env.get('SUPABASE_URL')!

  // Cliente com o token de quem chamou, só para descobrir quem é.
  const comoUsuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacao } },
  })

  const { data: quem, error: erroDeSessao } = await comoUsuario.auth.getUser()
  if (erroDeSessao || !quem.user) {
    return new Response('Sessão inválida', { status: 401 })
  }

  // Cliente com privilégio de administração, só para apagar.
  const comoAdmin = createClient(
    url,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { error } = await comoAdmin.auth.admin.deleteUser(quem.user.id)
  if (error) {
    return new Response(`Não consegui excluir: ${error.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ excluido: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
