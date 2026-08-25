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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pt-5 pb-6">
        <header>
          <h1 className="text-base font-semibold tracking-tight text-marca-forte">
            Bom Preço
          </h1>
        </header>

        {sessao.situacao === 'carregando' && (
          <p className="text-tinta-fraca">Preparando…</p>
        )}

        {sessao.situacao === 'erro' && (
          <p className="rounded-xl bg-perigo-fraca p-3 text-perigo-tinta">
            Não foi possível iniciar a sessão. {sessao.mensagem}
          </p>
        )}

        {/* A chave força remontagem a cada troca, e com ela a animação de
            entrada. Sem isso o React reaproveita o nó e a troca fica seca. */}
        {sessao.situacao === 'pronto' && (
          <div key={aba} className="anima-surgir flex flex-1 flex-col">
            {aba === 'lista' && <Lista usuarioId={sessao.perfil.id} />}
            {aba === 'buscar' && (
              <Consulta
                usuarioId={sessao.perfil.id}
                aoQuererRegistrar={() => setAba('registrar')}
              />
            )}
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
          </div>
        )}

        <ConviteDeInstalacao />
      </main>

      <Navegacao ativa={aba} aoTrocar={setAba} pendentes={envio.naFila} />
    </div>
  )
}
