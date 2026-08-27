import { useCallback, useState } from 'react'
import { useSessao, type Perfil } from './lib/sessao'
import { Convites } from './Convites'
import { Conta } from './Conta'
import { Escaneamento } from './Escaneamento'
import { Consulta } from './Consulta'
import { Lista } from './Lista'
import { Navegacao, type Aba } from './Navegacao'
import { useEnvio } from './lib/envio'
import { useConexao } from './lib/conexao'
import { useMercados } from './lib/mercado'

export default function App() {
  const sessao = useSessao()
  const [aba, setAba] = useState<Aba>('lista')
  const envio = useEnvio()
  const online = useConexao()

  /*
    Aceitar o convite de vínculo abre o formulário já na chegada.

    Levar para a tela de conta e deixar a pessoa procurar qual das linhas era
    desfaz metade do convite: ela disse que quer proteger a conta, e o passo
    seguinte tem de ser digitar o e-mail, não caçar onde se digita.

    Some ao sair da aba, para que voltar ali por conta própria não reabra um
    formulário que ninguém pediu desta vez.
  */
  const [abrirVinculo, setAbrirVinculo] = useState(false)

  const irPara = useCallback((nova: Aba) => {
    setAba(nova)
    if (nova !== 'conta') setAbrirVinculo(false)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 pt-5 pb-6">
        <header className="flex items-center justify-between gap-2">
          <h1 className="text-base font-semibold tracking-tight text-marca-forte">
            Bom Preço
          </h1>
          {/*
            Sem sinal, uma busca vazia parece um produto que ninguém cadastrou.
            O aviso separa "não existe" de "não consegui perguntar". Avisa, não
            bloqueia: o cadastro continua entrando na fila.
          */}
          {!online && (
            <span className="anima-surgir rounded-full bg-alerta-fraca px-2.5 py-1 text-xs font-medium text-alerta-tinta">
              Sem conexão
            </span>
          )}
        </header>

        {sessao.situacao === 'carregando' && (
          <p className="text-tinta-fraca">Preparando…</p>
        )}

        {sessao.situacao === 'erro' && (
          <p className="rounded-xl bg-perigo-fraca p-3 text-perigo-tinta">
            Não foi possível iniciar a sessão. {sessao.mensagem}
          </p>
        )}

        {sessao.situacao === 'pronto' && (
          <Abas
            aba={aba}
            aoTrocar={irPara}
            perfil={sessao.perfil}
            renomear={sessao.renomear}
            envio={envio}
            abrirVinculo={abrirVinculo}
          />
        )}

        <Convites
          anonimo={sessao.situacao === 'pronto' ? sessao.perfil.anonimo : null}
          naTelaDeConta={aba === 'conta'}
          aoQuererVincular={() => {
            setAba('conta')
            setAbrirVinculo(true)
          }}
        />
      </main>

      <Navegacao ativa={aba} aoTrocar={irPara} pendentes={envio.naFila} />
    </div>
  )
}

/**
 * A aba ativa monta só a sua seção; as outras desmontam.
 *
 * Desmontar custa o estado de quem estava no meio de um cadastro, mas é o
 * comportamento certo para a câmera: ela precisa desligar quando ninguém está
 * olhando. Trocar de aba no meio do registro é abandono deliberado.
 *
 * **O catálogo de mercados vive aqui, acima das abas.** Três seções precisam
 * dele, e cada uma chamava o próprio `useMercados` — de modo que trocar de aba
 * rebaixava a lista inteira de mercados e pedia a posição do GPS outra vez, com
 * os 8 segundos de espera que isso custa. É o mesmo motivo pelo qual o
 * `useEnvio` já morava no App: estado que é do app inteiro não pode nascer
 * dentro da aba que desmonta.
 *
 * Fica dentro deste componente, e não no App, porque ele só monta com a sessão
 * pronta — e isso é requisito, não arrumação: o `select` em `mercado` é
 * concedido a `authenticated`, então uma consulta disparada antes de a sessão
 * anônima existir sairia como `anon` e voltaria vazia.
 */
function Abas({
  aba,
  aoTrocar,
  perfil,
  renomear,
  envio,
  abrirVinculo,
}: {
  aba: Aba
  aoTrocar: (aba: Aba) => void
  perfil: Perfil
  renomear: (novo: string) => void
  envio: ReturnType<typeof useEnvio>
  /** Chegou aqui pelo convite: a linha do e-mail já vem aberta. */
  abrirVinculo: boolean
}) {
  const locais = useMercados()

  return (
    /* A chave força remontagem a cada troca, e com ela a animação de entrada.
       Sem isso o React reaproveita o nó e a troca fica seca. */
    <div key={aba} className="anima-surgir flex flex-1 flex-col">
      {aba === 'lista' && (
        <Lista usuarioId={perfil.id} locais={locais} aoIrPara={aoTrocar} />
      )}
      {aba === 'buscar' && (
        <Consulta
          usuarioId={perfil.id}
          locais={locais}
          envio={envio}
          aoQuererRegistrar={() => aoTrocar('registrar')}
        />
      )}
      {aba === 'registrar' && (
        <Escaneamento usuarioId={perfil.id} locais={locais} envio={envio} />
      )}
      {aba === 'conta' && (
        <Conta
          anonimo={perfil.anonimo}
          apelido={perfil.apelido}
          renomear={renomear}
          abrirVinculo={abrirVinculo}
        />
      )}
    </div>
  )
}
