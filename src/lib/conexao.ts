import { useEffect, useState } from 'react'

/**
 * Se o aparelho está online.
 *
 * `navigator.onLine` mente para cima: diz que há rede quando existe interface
 * de rede, ainda que ela não alcance nada. Mente pouco para baixo, porém, e é
 * o caso que importa aqui: quando ele diz que está offline, está mesmo.
 *
 * Serve para avisar, nunca para bloquear. O registro de preço continua indo
 * para a fila, e a fila continua tentando (RNF-06).
 */
export function useConexao(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const mudou = () => setOnline(navigator.onLine)
    window.addEventListener('online', mudou)
    window.addEventListener('offline', mudou)
    return () => {
      window.removeEventListener('online', mudou)
      window.removeEventListener('offline', mudou)
    }
  }, [])

  return online
}
