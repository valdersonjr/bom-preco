/**
 * Remove tudo que `semear-demonstracao.mjs` criou.
 *
 * Apaga preço, que a RD-02 diz ser imutável. A regra vale para o aplicativo:
 * nenhum caminho da interface altera ou remove registro, e nem o mantenedor
 * consegue pela API pública. Aqui é operação de manutenção com a chave de
 * serviço, e o que se remove é dado que nunca existiu numa prateleira.
 *
 * O corte é `usuario_id is null`: todo preço semeado nasce sem autor, e preço
 * de gente de verdade só fica sem autor depois de a conta ser excluída. Se
 * alguém já tiver excluído a conta, este script levaria junto os preços dela —
 * por isso ele conta antes e pede confirmação com --sim.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !chave) {
  console.error('faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, chave, { auth: { persistSession: false } })

const { count: semAutor } = await sb
  .from('registro_preco')
  .select('*', { count: 'exact', head: true })
  .is('usuario_id', null)

const { count: brasilia } = await sb
  .from('mercado')
  .select('*', { count: 'exact', head: true })
  .eq('cidade', 'Brasília')

console.log(`preços sem autor .......... ${semAutor}`)
console.log(`mercados em Brasília ...... ${brasilia}`)

if (!process.argv.includes('--sim')) {
  console.log('\nnada foi removido. Para remover mesmo:')
  console.log('  node scripts/limpar-demonstracao.mjs --sim')
  process.exit(0)
}

// Confirmação cai por cascata junto com o registro.
const { error: e1 } = await sb.from('registro_preco').delete().is('usuario_id', null)
if (e1) throw new Error(e1.message)

const { error: e2 } = await sb.from('mercado').delete().eq('cidade', 'Brasília')
if (e2) throw new Error(e2.message)

console.log('\nremovidos.')
