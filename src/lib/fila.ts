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

/**
 * Uma conexão só, reaproveitada por todas as operações.
 *
 * Antes cada chamada abria a sua e nenhuma fechava: esvaziar dez itens deixava
 * vinte conexões vivas. O acúmulo já bastaria, mas o efeito pior é outro —
 * conexão aberta bloqueia `onupgradeneeded`, então o dia em que a fila mudar de
 * formato o upgrade fica pendurado esperando as antigas sumirem.
 *
 * A promessa é descartada quando o banco erra ou é fechado, para a chamada
 * seguinte reabrir em vez de herdar uma conexão morta.
 */
let conexao: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  conexao ??= new Promise<IDBDatabase>((resolver, recusar) => {
    const pedido = indexedDB.open(BANCO, 1)

    pedido.onupgradeneeded = () => {
      const db = pedido.result
      if (!db.objectStoreNames.contains(LOJA)) {
        db.createObjectStore(LOJA, { keyPath: 'id' })
      }
    }

    pedido.onsuccess = () => {
      const db = pedido.result
      // Outra aba pediu upgrade: soltar esta conexão é o que deixa acontecer.
      db.onversionchange = () => {
        db.close()
        conexao = null
      }
      db.onclose = () => {
        conexao = null
      }
      resolver(db)
    }

    pedido.onerror = () => {
      conexao = null
      recusar(pedido.error)
    }
  })

  return conexao
}

function transacao<T>(
  modo: IDBTransactionMode,
  acao: (loja: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir()
    .then(
      (db) =>
        new Promise<T>((resolver, recusar) => {
          // `db.transaction` lança se a conexão fechou por baixo. A exceção cai
          // no `catch` abaixo, que invalida a conexão para a próxima reabrir.
          const pedido = acao(db.transaction(LOJA, modo).objectStore(LOJA))
          pedido.onsuccess = () => resolver(pedido.result)
          pedido.onerror = () => recusar(pedido.error)
        }),
    )
    .catch((erro: unknown) => {
      conexao = null
      throw erro
    })
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
