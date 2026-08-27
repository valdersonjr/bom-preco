import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Formatos de código de barras que aparecem em supermercado. EAN-13 cobre a
 * quase totalidade; EAN-8 aparece em embalagem pequena, e UPC em importado.
 */
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

/**
 * Intervalo entre tentativas de leitura.
 *
 * Antes o laço era `requestAnimationFrame` puro: um decode WebAssembly por
 * quadro, com a CPU no teto enquanto a câmera estivesse aberta. Ninguém aponta
 * o celular para o código de barras sessenta vezes por segundo — a dez por
 * segundo a leitura continua instantânea para quem segura o aparelho, e a
 * bateria sobra para o resto da compra.
 */
const INTERVALO_MS = 100

type Detector = {
  detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

/**
 * Devolve um detector, usando a API nativa quando existe.
 *
 * O Safari não expõe `BarcodeDetector` (risco R9), então cai num ponyfill em
 * WebAssembly. Ele é carregado sob demanda, e não no pacote inicial, porque o
 * RNF-08 dá 200 KB para o app inteiro e ele não precisa entrar nesse orçamento
 * antes de alguém tocar em "Escanear".
 *
 * Fora do pacote inicial, mas dentro do precache do service worker: cadastrar
 * preço sem sinal é o que o RNF-06 protege, e no Safari este arquivo é o único
 * caminho para a câmera ler a etiqueta.
 */
async function obterDetector(): Promise<Detector> {
  const nativo = (
    globalThis as unknown as {
      BarcodeDetector?: new (opcoes: { formats: readonly string[] }) => Detector
    }
  ).BarcodeDetector

  if (nativo) return new nativo({ formats: FORMATOS })

  const { BarcodeDetector } = await import('barcode-detector/ponyfill')
  return new BarcodeDetector({ formats: [...FORMATOS] }) as Detector
}

type Estado =
  | 'parado'
  | 'iniciando'
  | 'lendo'
  | 'negado'
  | 'indisponivel'
  | 'falhou'

export function useLeitorDeCodigo(aoLer: (gtin: string) => void) {
  const video = useRef<HTMLVideoElement | null>(null)
  const trilha = useRef<MediaStream | null>(null)
  const rodando = useRef(false)
  const proximaLeitura = useRef<number | null>(null)
  const [estado, setEstado] = useState<Estado>('parado')

  const parar = useCallback(() => {
    rodando.current = false
    if (proximaLeitura.current !== null) {
      clearTimeout(proximaLeitura.current)
      proximaLeitura.current = null
    }
    trilha.current?.getTracks().forEach((t) => t.stop())
    trilha.current = null
    if (video.current) video.current.srcObject = null
    setEstado('parado')
  }, [])

  const iniciar = useCallback(async () => {
    if (rodando.current) return
    setEstado('iniciando')

    let detector: Detector
    try {
      detector = await obterDetector()
    } catch {
      setEstado('indisponivel')
      return
    }

    try {
      // `environment` pede a câmera traseira, que é a que aponta para a
      // prateleira. Sem isso o celular abre a frontal.
      trilha.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
    } catch {
      setEstado('negado')
      return
    }

    /*
      Daqui para baixo a câmera já está ligada, e toda saída precisa desligá-la.

      Antes não desligava. O elemento ausente devolvia cedo e o `play()`
      rejeitado subia sem tratamento — os dois deixando `rodando` falso e o
      estado preso em `iniciando`. Como o botão de parar só aparece com o estado
      `lendo`, a luz da câmera ficava acesa sem nada na tela capaz de apagá-la.

      Não é caso raro no alvo do RNF-02: `play()` rejeita no Safari do iOS
      quando a janela do gesto do usuário expira, e ela expira exatamente aqui,
      depois de carregar o ponyfill e de esperar a resposta da permissão.
    */
    try {
      const el = video.current
      if (!el) throw new Error('elemento de vídeo ausente')
      el.srcObject = trilha.current
      await el.play()
    } catch {
      parar()
      setEstado('falhou')
      return
    }

    rodando.current = true
    setEstado('lendo')

    const procurar = async () => {
      if (!rodando.current || !video.current) return
      try {
        const achados = await detector.detect(video.current)
        const codigo = achados[0]?.rawValue
        if (codigo) {
          parar()
          aoLer(codigo)
          return
        }
      } catch {
        // Quadro ruim acontece o tempo todo; tenta o próximo.
      }
      // O `requestAnimationFrame` depois da espera é o que suspende a leitura
      // quando a aba sai de vista, em vez de decodificar contra um vídeo parado.
      proximaLeitura.current = window.setTimeout(() => {
        requestAnimationFrame(() => void procurar())
      }, INTERVALO_MS)
    }
    void procurar()
  }, [aoLer, parar])

  useEffect(() => parar, [parar])

  return { video, estado, iniciar, parar }
}
