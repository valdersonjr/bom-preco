import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Perfil = {
  id: string
  apelido: string
  anonimo: boolean
}

type Estado =
  | { situacao: 'carregando' }
  | { situacao: 'pronto'; perfil: Perfil }
  | { situacao: 'erro'; mensagem: string }

/**
 * Garante uma sessão desde a primeira abertura, sem pedir nada a ninguém
 * (RF-01). O perfil e o apelido vêm do banco, criados por trigger junto com o
 * usuário — o cliente nunca insere em `perfil`.
 *
 * A sessão fica no armazenamento do navegador e sobrevive a fechar o app. No
 * iOS isso depende de o app estar instalado na tela inicial, que é a mitigação
 * do risco R12.
 */
export function useSessao(): Estado & { renomear: (novo: string) => void } {
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' })

  useEffect(() => {
    let ativo = true

    async function iniciar() {
      const { data: sessaoAtual } = await supabase.auth.getSession()

      if (!sessaoAtual.session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) {
          if (ativo) {
            setEstado({ situacao: 'erro', mensagem: error.message })
          }
          return
        }
      }

      const { data: usuario } = await supabase.auth.getUser()
      if (!usuario.user) {
        if (ativo) {
          setEstado({ situacao: 'erro', mensagem: 'Sessão não estabelecida.' })
        }
        return
      }

      const { data: perfil, error } = await supabase
        .from('perfil')
        .select('id, apelido, anonimo')
        .eq('id', usuario.user.id)
        .single()

      if (!ativo) return
      if (error || !perfil) {
        setEstado({
          situacao: 'erro',
          mensagem: error?.message ?? 'Perfil não encontrado.',
        })
        return
      }

      setEstado({ situacao: 'pronto', perfil })
    }

    void iniciar()
    return () => {
      ativo = false
    }
  }, [])

  async function renomear(novo: string) {
    const apelido = novo.trim()
    if (!apelido || estado.situacao !== 'pronto') return

    const anterior = estado.perfil
    setEstado({ situacao: 'pronto', perfil: { ...anterior, apelido } })

    const { error } = await supabase
      .from('perfil')
      .update({ apelido })
      .eq('id', anterior.id)

    if (error) setEstado({ situacao: 'pronto', perfil: anterior })
  }

  return { ...estado, renomear }
}
