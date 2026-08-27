import { useConviteDeInstalacao, type Convite } from './lib/instalacao'
import {
  adiarConviteAVincular,
  useDeveConvidarAVincular,
  useRegistrosFeitos,
} from './lib/vinculo'

/**
 * Os dois convites do app, e qual deles fala.
 *
 * Instalar e vincular protegem a mesma coisa — a conta que hoje só existe neste
 * navegador — por caminhos diferentes: instalar isenta o app da limpeza de 7
 * dias do iOS (RF-39, risco R12); vincular sobrevive a trocar de aparelho
 * (RF-38). Os dois cabem na mesma tela, e é justamente por isso que só um pode
 * aparecer: dois avisos empilhados dizendo "você pode perder tudo" viram um
 * bloco que a pessoa aprende a pular.
 *
 * **Quando ambos cabem, vence o de vincular.** O de instalação está disponível
 * desde a primeira abertura, quando ainda não há nada a perder; o de vínculo só
 * existe depois de alguns registros, ou seja, só aparece quando a conta passou
 * a valer alguma coisa. E é o único dos dois que continua valendo num aparelho
 * novo — instalar protege o armazenamento *deste* navegador, e um celular
 * perdido leva o armazenamento junto.
 */
export function Convites({
  anonimo,
  naTelaDeConta,
  aoQuererVincular,
}: {
  /** Nulo enquanto a sessão não ficou pronta: ainda não se sabe. */
  anonimo: boolean | null
  /**
   * Onde vincular já é uma linha da tela. O convite existe para interromper
   * quem está em outro assunto; ali ele repetiria, logo abaixo do formulário,
   * o pedido que acabou de abrir aquele formulário.
   *
   * O de instalação continua valendo: a tela de conta não tem nada que o
   * substitua.
   */
  naTelaDeConta: boolean
  aoQuererVincular: () => void
}) {
  const instalacao = useConviteDeInstalacao()
  const registros = useRegistrosFeitos()
  const convidarAVincular = useDeveConvidarAVincular(anonimo)

  if (!naTelaDeConta && convidarAVincular) {
    return (
      <ConviteAVincular
        registros={registros}
        aoAceitar={aoQuererVincular}
        aoAdiar={adiarConviteAVincular}
      />
    )
  }

  if (instalacao.tipo !== 'nenhum') {
    return <ConviteDeInstalacao convite={instalacao} />
  }

  return null
}

/**
 * Convida a proteger a conta com e-mail (RF-38).
 *
 * Em âmbar, e não na cor da marca: é o mesmo tom do selo "Só neste aparelho" na
 * tela de conta, e as duas coisas dizem a mesma frase. O convite de instalação
 * fica com o verde, o que também impede confundir um com o outro.
 *
 * A contagem entra no texto porque é ela que torna o aviso concreto. "Proteja
 * sua conta" é conselho genérico; "seus 7 preços" é uma quantidade que a pessoa
 * reconhece como trabalho dela.
 *
 * Aceitar leva à tela de conta com o campo aberto, em vez de repetir o
 * formulário aqui. Um formulário de e-mail em dois lugares é a mesma regra
 * escrita duas vezes, e a segunda cópia é a que envelhece.
 */
function ConviteAVincular({
  registros,
  aoAceitar,
  aoAdiar,
}: {
  registros: number
  aoAceitar: () => void
  aoAdiar: () => void
}) {
  return (
    <aside className="anima-surgir rounded-xl border border-alerta-borda bg-alerta-fraca p-4">
      <p className="text-alerta-tinta">
        <strong className="font-medium">
          {registros === 1
            ? 'Seu preço está seguro'
            : `Seus ${registros} preços estão seguros`}
          .
        </strong>{' '}
        Sua conta não — ela existe só neste navegador.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={aoAceitar}
          className="min-h-11 rounded-lg bg-alerta px-4 font-medium text-sobre-alerta"
        >
          Proteger com e-mail
        </button>
        <button
          type="button"
          onClick={aoAdiar}
          className="min-h-11 rounded-lg px-4 text-alerta-tinta underline"
        >
          Agora não
        </button>
      </div>
    </aside>
  )
}

/** Convida a instalar na tela inicial (RF-39). */
function ConviteDeInstalacao({ convite }: { convite: Convite }) {
  if (convite.tipo === 'nenhum') return null

  return (
    <aside className="rounded-xl border border-marca-borda bg-marca-fraca p-4">
      <p className="text-marca-forte">
        Instale na tela inicial para não perder seus dados.
      </p>

      {/* Esta fica: é o passo a passo de quem não tem botão de instalar, e
          sem ele o convite pede algo que a pessoa não sabe fazer. */}
      {convite.tipo === 'instrucao' && (
        <p className="mt-2 text-sm text-marca-forte">
          Toque em <strong>Compartilhar</strong> e escolha{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {convite.tipo === 'automatico' && (
          <button
            type="button"
            onClick={convite.instalar}
            className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={convite.dispensar}
          className="min-h-11 rounded-lg px-4 text-marca-forte underline"
        >
          Agora não
        </button>
      </div>
    </aside>
  )
}
