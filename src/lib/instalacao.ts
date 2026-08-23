import { useEffect, useState } from 'react'

// O Chrome dispara este evento quando o app é instalável. Não está nos tipos
// padrão do DOM porque não é padrão — só navegadores baseados em Chromium têm.
type EventoDeInstalacao = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const CHAVE_DISPENSA = 'convite-instalacao-dispensado'

function jaInstalado(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // O Safari do iOS não implementa display-mode e usa esta propriedade própria.
  return (navigator as { standalone?: boolean }).standalone === true
}

function ehIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export type Convite =
  | { tipo: 'nenhum' }
  | { tipo: 'automatico'; instalar: () => void; dispensar: () => void }
  | { tipo: 'instrucao'; dispensar: () => void }

/**
 * Convida a instalar na tela inicial (RF-39).
 *
 * Não é conforto: no iOS, web app aberto pelo navegador tem o armazenamento
 * apagado após 7 dias sem interação, e junto vão a sessão anônima e a fila de
 * reenvio. Instalado, o app fica isento dessa limpeza — é a mitigação do R12.
 *
 * Os dois sistemas exigem caminhos diferentes: o Chrome oferece um evento que
 * abre o diálogo nativo; o Safari não tem equivalente, e só resta instruir.
 */
export function useConviteDeInstalacao(): Convite {
  const [evento, setEvento] = useState<EventoDeInstalacao | null>(null)
  const [dispensado, setDispensado] = useState(
    () => sessionStorage.getItem(CHAVE_DISPENSA) === '1',
  )

  useEffect(() => {
    function aoPoderInstalar(e: Event) {
      // Sem isto o Chrome mostra o próprio banner, no momento dele.
      e.preventDefault()
      setEvento(e as EventoDeInstalacao)
    }
    window.addEventListener('beforeinstallprompt', aoPoderInstalar)
    return () =>
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
  }, [])

  function dispensar() {
    sessionStorage.setItem(CHAVE_DISPENSA, '1')
    setDispensado(true)
  }

  if (dispensado || jaInstalado()) return { tipo: 'nenhum' }

  if (evento) {
    return {
      tipo: 'automatico',
      dispensar,
      instalar: () => {
        void evento.prompt()
        setEvento(null)
      },
    }
  }

  if (ehIOS()) return { tipo: 'instrucao', dispensar }

  return { tipo: 'nenhum' }
}
