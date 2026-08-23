import { useCallback, useEffect, useState } from 'react'
import { desenfileirar, enfileirar, pendentes, quantosPendentes } from './fila'
import { enviarRegistro, type Registro } from './registro'

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

  const atualizarContagem = useCallback(async () => {
    setNaFila(await quantosPendentes())
  }, [])

  /**
   * Esvazia a fila em série, e não em paralelo: dentro do mercado o sinal mal
   * aguenta uma requisição, e dez simultâneas falhariam todas.
   */
  const esvaziar = useCallback(async () => {
    if (!navigator.onLine) return

    const fila = await pendentes()
    if (fila.length === 0) return

    setEnviando(true)
    for (const registro of fila) {
      const resultado = await enviarRegistro(registro)
      if (!resultado.ok) break // rede caiu de novo; o resto fica para depois
      await desenfileirar(registro.id)
    }

    setEnviando(false)
    await atualizarContagem()
  }, [atualizarContagem])

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
    window.addEventListener('online', esvaziar)
    return () => window.removeEventListener('online', esvaziar)
  }, [esvaziar])

  return { naFila, enviando, registrar }
}
