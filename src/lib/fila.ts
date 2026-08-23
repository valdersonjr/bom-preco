import type { Registro } from './registro'

const BANCO = 'bom-preco'
const LOJA = 'fila-de-registros'

/**
 * Fila local de registros de preço (RNF-06).
 *
 * IndexedDB, e não `localStorage`, por dois motivos: guarda objeto sem
 * serializar à mão, e não tem o teto de poucos megabytes que uma fila de
 * cadastros acumulados pode estourar.
 *
 * Sobrevive a fechar o app. No iOS isso depende de o app estar instalado na
 * tela inicial — mesma condição da sessão anônima, mesmo risco R12.
 */
function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, recusar) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => {
      const db = pedido.result
      if (!db.objectStoreNames.contains(LOJA)) {
        db.createObjectStore(LOJA, { keyPath: 'id' })
      }
    }
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => recusar(pedido.error)
  })
}

function transacao<T>(
  modo: IDBTransactionMode,
  acao: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolver, recusar) => {
        const pedido = acao(db.transaction(LOJA, modo).objectStore(LOJA))
        pedido.onsuccess = () => resolver(pedido.result)
        pedido.onerror = () => recusar(pedido.error)
      }),
  )
}

export function enfileirar(registro: Registro): Promise<unknown> {
  return transacao('readwrite', (loja) => loja.put(registro))
}

export function pendentes(): Promise<Registro[]> {
  return transacao<Registro[]>('readonly', (loja) => loja.getAll())
}

export function desenfileirar(id: string): Promise<unknown> {
  return transacao('readwrite', (loja) => loja.delete(id))
}

export function quantosPendentes(): Promise<number> {
  return transacao<number>('readonly', (loja) => loja.count())
}
