import { useCallback, useEffect, useRef, useState } from 'react'
import { desenfileirar, enfileirar, pendentes, quantosPendentes } from './fila'
import { enviarRegistro, type Registro } from './registro'

/**
 * Espera antes da tentativa seguinte, dobrando a cada falha até o teto.
 *
 * O sinal dentro do mercado não cai de vez: ele oscila. Tentar de novo no mesmo
 * segundo gasta bateria e falha igual; esperar até a próxima abertura do app
 * deixa o preço represado por horas. A espera crescente cobre os dois casos com
 * uma regra só.
 */
const ESPERA_INICIAL_MS = 5_000
const ESPERA_MAXIMA_MS = 5 * 60_000

/**
 * Fila de reenvio (RNF-06): nenhum registro iniciado sem conectividade pode ser
 * perdido.
 *
 * Todo registro entra na fila antes de qualquer tentativa de rede. Só sai de lá
 * depois de o banco confirmar. Assim, app fechado no meio do envio não perde
 * nada — o item continua na fila e sobe na próxima abertura.
 */
export function useEnvio() {
  const [naFila, setNaFila] = useState(0)
  const [enviando, setEnviando] = useState(false)

  /** Impede dois esvaziamentos simultâneos disputando a mesma fila. */
  const emCurso = useRef(false)
  /** Falhas consecutivas. É o expoente da espera. */
  const falhas = useRef(0)
  const agendado = useRef<number | null>(null)
  /** Quebra o ciclo entre `esvaziar` e o agendamento que o chama de volta. */
  const proxima = useRef<() => void>(() => {})

  const atualizarContagem = useCallback(async () => {
    setNaFila(await quantosPendentes())
  }, [])

  const cancelarAgendamento = useCallback(() => {
    if (agendado.current !== null) {
      clearTimeout(agendado.current)
      agendado.current = null
    }
  }, [])

  const agendar = useCallback(() => {
    if (agendado.current !== null) return
    const espera = Math.min(
      ESPERA_INICIAL_MS * 2 ** falhas.current,
      ESPERA_MAXIMA_MS,
    )
    falhas.current += 1
    agendado.current = window.setTimeout(() => {
      agendado.current = null
      proxima.current()
    }, espera)
  }, [])

  /**
   * Esvazia a fila em série, e não em paralelo: dentro do mercado o sinal mal
   * aguenta uma requisição, e dez simultâneas falhariam todas.
   *
   * Quando a rede cai no meio, o resto da fila fica para a tentativa seguinte —
   * agendada aqui mesmo, com espera crescente. Sem isso o item só subia na
   * próxima vez que a pessoa abrisse o app, que é justamente quando ela não
   * está mais no mercado.
   */
  const esvaziar = useCallback(async () => {
    if (emCurso.current || !navigator.onLine) return

    const fila = await pendentes()
    if (fila.length === 0) {
      falhas.current = 0
      return
    }

    emCurso.current = true
    setEnviando(true)

    let falhou = false
    try {
      for (const registro of fila) {
        const resultado = await enviarRegistro(registro)
        if (!resultado.ok) {
          falhou = true
          break // rede caiu de novo; o resto fica para a próxima tentativa
        }
        await desenfileirar(registro.id)
      }
    } finally {
      emCurso.current = false
      setEnviando(false)
    }

    await atualizarContagem()

    if (falhou) agendar()
    else falhas.current = 0
  }, [atualizarContagem, agendar])

  useEffect(() => {
    proxima.current = () => void esvaziar()
  }, [esvaziar])

  const registrar = useCallback(
    async (registro: Registro) => {
      await enfileirar(registro)
      await atualizarContagem()
      await esvaziar()
    },
    [atualizarContagem, esvaziar],
  )

  useEffect(() => {
    // Este é o caso em que efeito é a ferramenta certa: sincronizar com dois
    // sistemas externos — o armazenamento local e a rede. O aviso do linter
    // sobre setState em efeito não se aplica; nada aqui roda antes de um await,
    // e o estado só muda quando a fila ou a conexão mudam de verdade.
    // oxlint-disable-next-line react/set-state-in-effect
    void esvaziar()

    // Sinal de volta zera a conta: a espera crescente existe para não insistir
    // no escuro, e aqui já se sabe que a rede voltou.
    const aoVoltarASinal = () => {
      cancelarAgendamento()
      falhas.current = 0
      void esvaziar()
    }

    window.addEventListener('online', aoVoltarASinal)
    return () => {
      window.removeEventListener('online', aoVoltarASinal)
      cancelarAgendamento()
    }
  }, [esvaziar, cancelarAgendamento])

  return { naFila, enviando, registrar }
}
