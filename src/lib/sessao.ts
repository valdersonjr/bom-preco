import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Perfil = {
  id: string
  apelido: string
  anonimo: boolean
}

const CHAVE_PERFIL = 'perfil-guardado'

/** Cópia local do perfil, para o app abrir sem rede. Apelido e mais nada. */
function guardarPerfil(perfil: Perfil) {
  try {
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil))
  } catch {
    // Sem onde guardar, o app só não abre sem sinal — como era antes.
  }
}

function perfilGuardado(): Perfil | null {
  try {
    const bruto = localStorage.getItem(CHAVE_PERFIL)
    return bruto ? (JSON.parse(bruto) as Perfil) : null
  } catch {
    return null
  }
}

/**
 * A pergunta não chegou ao servidor?
 *
 * O cliente de autenticação marca a falha de rede com um nome próprio. O
 * `navigator.onLine` entra como segunda opinião: quando ele diz que não há
 * rede, não há mesmo.
 */
function semRede(erro: { name?: string } | null): boolean {
  return erro?.name === 'AuthRetryableFetchError' || !navigator.onLine
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

      /*
        Com rede, quem diz quem é a pessoa é o servidor. Sem rede, é o que o
        aparelho lembra.

        Antes só existia o primeiro caminho, e o app parava aqui dentro do
        mercado — antes mesmo de chegar à lista, que é a tela usada lá. A
        sessão já mora no armazenamento do navegador; faltava lembrar o perfil
        junto, e aceitar os dois quando o servidor não responde.

        Só vale para falha de rede. Se o servidor respondeu que a sessão não
        existe mais, o perfil guardado é de uma conta que acabou, e abrir o
        app com ele seria aceitar escritas que vão ser todas recusadas.
      */
      const { data: usuario, error: aoPerguntar } = await supabase.auth.getUser()

      if (!usuario.user) {
        const guardado = semRede(aoPerguntar) ? perfilGuardado() : null
        const local = sessaoAtual.session?.user.id
        if (ativo && guardado && guardado.id === local) {
          setEstado({ situacao: 'pronto', perfil: guardado })
          return
        }
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
        const guardado = !error?.code ? perfilGuardado() : null
        if (guardado && guardado.id === usuario.user.id) {
          setEstado({ situacao: 'pronto', perfil: guardado })
          return
        }
        setEstado({
          situacao: 'erro',
          mensagem: error?.message ?? 'Perfil não encontrado.',
        })
        return
      }

      guardarPerfil(perfil)
      setEstado({ situacao: 'pronto', perfil })
    }

    // Sem rede, o cliente lança em vez de devolver `error`, e o estado ficava
    // preso em 'carregando' para sempre.
    iniciar().catch((erro: unknown) => {
      if (ativo) {
        setEstado({
          situacao: 'erro',
          mensagem: erro instanceof Error ? erro.message : String(erro),
        })
      }
    })
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
    else guardarPerfil({ ...anterior, apelido })
  }

  return { ...estado, renomear }
}
