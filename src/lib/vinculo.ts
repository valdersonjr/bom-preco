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
