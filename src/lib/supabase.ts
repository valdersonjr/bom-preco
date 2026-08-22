import { createClient } from '@supabase/supabase-js'
import type { Database } from '../tipos/banco'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !chave) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Veja .env.example.',
  )
}

// A chave anônima é pública por natureza: o que protege o banco são as
// políticas de acesso e os privilégios, não o segredo da chave. A chave de
// serviço, essa sim, nunca entra no cliente nem no repositório.
export const supabase = createClient<Database>(url, chave)
