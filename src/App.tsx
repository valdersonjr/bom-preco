import { useState } from 'react'
import { useSessao } from './lib/sessao'
import { ConviteDeInstalacao } from './ConviteDeInstalacao'
import { Conta } from './Conta'
import { Escaneamento } from './Escaneamento'
import { Consulta } from './Consulta'
import { Lista } from './Lista'
import { Navegacao, type Aba } from './Navegacao'
import { useEnvio } from './lib/envio'

/**
 * A aba ativa monta só a sua seção; as outras desmontam.
 *
 * Desmontar custa o estado de quem estava no meio de um cadastro, mas é o
 * comportamento certo para a câmera: ela precisa desligar quando ninguém está
 * olhando. Trocar de aba no meio do registro é abandono deliberado.
 */
export default function App() {
  const sessao = useSessao()
  const [aba, setAba] = useState<Aba>('lista')
  const envio = useEnvio()

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
        <header>
          <h1 className="text-xl font-semibold text-green-800">Bom Preço</h1>
        </header>

        {sessao.situacao === 'carregando' && (
          <p className="text-neutral-500">Preparando…</p>
        )}

        {sessao.situacao === 'erro' && (
          <p className="rounded-lg bg-red-50 p-3 text-red-800">
            Não foi possível iniciar a sessão. {sessao.mensagem}
          </p>
        )}

        {sessao.situacao === 'pronto' && (
          <>
            {aba === 'lista' && <Lista usuarioId={sessao.perfil.id} />}
            {aba === 'buscar' && <Consulta usuarioId={sessao.perfil.id} />}
            {aba === 'registrar' && (
              <Escaneamento usuarioId={sessao.perfil.id} envio={envio} />
            )}
            {aba === 'conta' && (
              <Conta
                anonimo={sessao.perfil.anonimo}
                apelido={sessao.perfil.apelido}
                renomear={sessao.renomear}
              />
            )}
          </>
        )}

        <ConviteDeInstalacao />
      </main>

      <Navegacao ativa={aba} aoTrocar={setAba} pendentes={envio.naFila} />
    </div>
  )
}
