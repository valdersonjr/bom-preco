import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

/*
  Quem procura a versão nova, e quando.

  O registro automático do plugin só confere o service worker quando a página
  carrega do zero. O app instalado na tela inicial quase nunca carrega do zero:
  fica em memória e é retomado, às vezes por semanas. Publicava-se uma versão e
  o aparelho de quem mais usa o app era o último a recebê-la.

  Agora a conferência acontece toda vez que o app volta para a frente. E como o
  registro passa por aqui, o modo `autoUpdate` recarrega a página quando o
  service worker novo assume — antes ele assumia e a tela seguia com o código
  antigo até alguém fechar tudo.

  O momento é escolhido de propósito: ao voltar para o app a pessoa ainda não
  começou a digitar nada, então o recarregamento não leva um preço pela metade.
  O que já foi salvo está na fila, que sobrevive a ele (RNF-06).
*/
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registro.update()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
