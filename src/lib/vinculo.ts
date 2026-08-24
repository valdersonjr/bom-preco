import { useState } from 'react'
import { supabase } from './supabase'

const CHAVE_CONTAGEM = 'precos-registrados'
const REGISTROS_ATE_CONVIDAR = 3

/**
 * Quantos preços esta pessoa já registrou neste aparelho.
 *
 * Fica no armazenamento local porque o cliente não lê `registro_preco` — a
 * revogação que protege a autoria (RNF-12) também impede contar do lado de cá.
 * E para decidir a hora do convite, o que o aparelho sabe basta.
 */
export function contarRegistro() {
  const atual = Number(localStorage.getItem(CHAVE_CONTAGEM) ?? '0')
  localStorage.setItem(CHAVE_CONTAGEM, String(atual + 1))
}

export function registrosFeitos(): number {
  return Number(localStorage.getItem(CHAVE_CONTAGEM) ?? '0')
}

/** O convite não aparece na primeira abertura: só quando há o que perder. */
export function deveConvidarAVincular(anonimo: boolean): boolean {
  return anonimo && registrosFeitos() >= REGISTROS_ATE_CONVIDAR
}

type Situacao =
  | { estado: 'parado' }
  | { estado: 'enviando' }
  | { estado: 'enviado'; email: string }
  | { estado: 'erro'; mensagem: string }

/**
 * Vincula a conta anônima a um e-mail (RF-38), preservando o mesmo usuário e
 * portanto a autoria de tudo que já foi cadastrado.
 *
 * A confirmação chega por e-mail e é clicada fora do app. Quem atualiza
 * `perfil.anonimo` é um gatilho no banco, não este código.
 */
export function useVinculo() {
  const [situacao, setSituacao] = useState<Situacao>({ estado: 'parado' })

  async function vincularEmail(email: string) {
    const endereco = email.trim()
    if (!endereco) return

    setSituacao({ estado: 'enviando' })
    const { error } = await supabase.auth.updateUser({ email: endereco })

    setSituacao(
      error
        ? { estado: 'erro', mensagem: error.message }
        : { estado: 'enviado', email: endereco },
    )
  }

  return { situacao, vincularEmail }
}

/**
 * Exclui a conta (RF-40, RD-11).
 *
 * Chama a função de servidor, que é onde vive a chave capaz de apagar do
 * serviço de identidade. A função descobre quem está pedindo pelo próprio
 * token — não há como pedir a exclusão de conta alheia.
 *
 * Os preços cadastrados permanecem, sem dono.
 */
export async function excluirConta(): Promise<{ ok: boolean; motivo?: string }> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, motivo: 'Sem sessão ativa.' }

  const resposta = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excluir-conta`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    },
  )

  if (!resposta.ok) return { ok: false, motivo: await resposta.text() }

  await supabase.auth.signOut()
  return { ok: true }
}
