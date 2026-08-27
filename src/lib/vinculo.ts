import { useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase'

const CHAVE_CONTAGEM = 'precos-registrados'
const CHAVE_ADIAMENTO = 'convite-vinculo-adiado-em'

/** Abaixo disso não há o que proteger, e o convite seria só interrupção. */
const REGISTROS_ATE_CONVIDAR = 3

/**
 * Registros a mais antes de insistir com quem já disse "agora não".
 *
 * Dispensar não é "nunca mais", porque o risco não é fixo: quem tem trinta
 * preços cadastrados só neste navegador perde mais do que quem tinha três. Mas
 * também não é "na próxima sessão" — repetir o mesmo pedido no dia seguinte é
 * o que faz a pessoa aprender a ignorar o aviso.
 *
 * Contar em registros, e não em dias, amarra a insistência ao que ela protege.
 */
const REGISTROS_ATE_INSISTIR = 10

/** Quem quer saber quando a contagem muda. */
const ouvintes = new Set<() => void>()

function ler(chave: string): number | null {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto === null ? null : Number(bruto)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: number) {
  try {
    localStorage.setItem(chave, String(valor))
  } catch {
    // Armazenamento cheio ou bloqueado. A contagem é para decidir a hora de um
    // convite; perdê-la não pode derrubar o envio do preço, que é o que importa.
  }
  ouvintes.forEach((avisar) => avisar())
}

/**
 * Quantos preços esta pessoa já registrou neste aparelho.
 *
 * Fica no armazenamento local porque o cliente não lê `registro_preco` — a
 * revogação que protege a autoria (RNF-12) também impede contar do lado de cá.
 * E para decidir a hora do convite, o que o aparelho sabe basta.
 */
export function contarRegistro() {
  gravar(CHAVE_CONTAGEM, registrosFeitos() + 1)
}

export function registrosFeitos(): number {
  return ler(CHAVE_CONTAGEM) ?? 0
}

function assinar(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar)
  return () => {
    ouvintes.delete(aoMudar)
  }
}

/**
 * A contagem como estado, e não como leitura solta no meio do render.
 *
 * O convite depende dela, e ela muda no fim de um envio — longe de qualquer
 * componente. Lida direto do armazenamento, a tela só a enxergava quando algo
 * *outro* provocava um render, e o convite aparecia por acidente de ordem em
 * vez de por decisão. `useSyncExternalStore` é exatamente para isto:
 * `localStorage` é um sistema externo, e agora ele avisa.
 */
export function useRegistrosFeitos(): number {
  return useSyncExternalStore(assinar, registrosFeitos)
}

/**
 * Vale a pena proteger esta conta com e-mail?
 *
 * Verdadeiro assim que houver o que perder. É o que decide o rótulo discreto na
 * tela de conta — lá a pessoa já foi procurar o assunto, então nada é adiado.
 */
export function vinculoRecomendado(anonimo: boolean): boolean {
  return anonimo && registrosFeitos() >= REGISTROS_ATE_CONVIDAR
}

/**
 * Chegou a hora de interromper com o convite?
 *
 * Mais restrito que `vinculoRecomendado`: este aparece por cima do que a pessoa
 * está fazendo, então respeita o "agora não" até que haja bem mais em jogo.
 * Nunca na primeira abertura — só quando há o que perder.
 */
function podeConvidar(): boolean {
  const feitos = registrosFeitos()
  if (feitos < REGISTROS_ATE_CONVIDAR) return false

  const adiadoEm = ler(CHAVE_ADIAMENTO)
  if (adiadoEm === null) return true
  return feitos >= adiadoEm + REGISTROS_ATE_INSISTIR
}

/**
 * A decisão inteira como estado, e não só a contagem.
 *
 * Esta separação custou um defeito para aparecer: com o `useSyncExternalStore`
 * devolvendo só `registrosFeitos()`, tocar em "agora não" gravava o adiamento e
 * avisava os ouvintes — mas o número continuava o mesmo, o React comparava
 * snapshots iguais e não redesenhava nada. O convite ficava na tela depois de
 * ser dispensado.
 *
 * A regra é a lição: o snapshot precisa cobrir **tudo** que a decisão lê do
 * armazenamento, não a parte mais óbvia dela. Aqui ele é o booleano final, o
 * que torna impossível esse descompasso voltar.
 *
 * `anonimo` fica de fora porque não vem do armazenamento — vem do perfil, e o
 * React já redesenha quando ele muda.
 */
export function useDeveConvidarAVincular(anonimo: boolean | null): boolean {
  const cabe = useSyncExternalStore(assinar, podeConvidar)
  return anonimo === true && cabe
}

/** "Agora não": cala o convite até a pessoa ter bem mais a perder. */
export function adiarConviteAVincular() {
  gravar(CHAVE_ADIAMENTO, registrosFeitos())
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
