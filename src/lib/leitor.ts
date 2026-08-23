import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Formatos de código de barras que aparecem em supermercado. EAN-13 cobre a
 * quase totalidade; EAN-8 aparece em embalagem pequena, e UPC em importado.
 */
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

type Detector = {
  detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]>
}

/**
 * Devolve um detector, usando a API nativa quando existe.
 *
 * O Safari não expõe `BarcodeDetector` (risco R9), então cai num ponyfill em
 * WebAssembly. Ele é carregado sob demanda, e não no pacote inicial, porque
 * pesa mais que o resto do app junto — e o RNF-08 dá 200 KB para tudo.
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

type Estado = 'parado' | 'iniciando' | 'lendo' | 'negado' | 'indisponivel'

export function useLeitorDeCodigo(aoLer: (gtin: string) => void) {
  const video = useRef<HTMLVideoElement | null>(null)
  const trilha = useRef<MediaStream | null>(null)
  const rodando = useRef(false)
  const [estado, setEstado] = useState<Estado>('parado')

  const parar = useCallback(() => {
    rodando.current = false
    trilha.current?.getTracks().forEach((t) => t.stop())
    trilha.current = null
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

    const el = video.current
    if (!el) return
    el.srcObject = trilha.current
    await el.play()

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
      requestAnimationFrame(() => void procurar())
    }
    void procurar()
  }, [aoLer, parar])

  useEffect(() => parar, [parar])

  return { video, estado, iniciar, parar }
}
