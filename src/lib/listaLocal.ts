import { supabase } from './supabase'
import type { ItemDaLista } from './lista'

/**
 * A lista de compras, guardada no aparelho para funcionar sem sinal.
 *
 * A lista é a tela usada no corredor, e o corredor é onde o sinal falha. Antes,
 * sem rede, ela simplesmente não abria — justo na hora em que servia.
 *
 * Duas coisas ficam aqui, e só elas:
 *
 * **A última lista vista.** Com os preços daquele momento; a tela diz desde
 * quando não atualiza. É leitura, não fonte de verdade: assim que a rede volta,
 * vale o que está no servidor.
 *
 * **As marcas de "já peguei" feitas sem sinal.** É a única escrita que a pessoa
 * faz andando pelo mercado, e por isso a única que tem fila. Acrescentar item e
 * mudar quantidade continuam pedindo rede — são coisas de antes de sair de
 * casa.
 *
 * `localStorage`, e não IndexedDB como a fila de preços: são dois valores
 * pequenos, lidos de uma vez no primeiro render, e leitura síncrona é o que
 * deixa a lista aparecer sem um quadro de espera.
 *
 * Tudo aqui é do próprio aparelho e da própria pessoa. Nada disto é dado novo:
 * é cópia local do que a lista já guarda no servidor.
 */

const CHAVE_LISTA = 'lista-guardada'
const CHAVE_MARCAS = 'marcas-pendentes'

type Guardada = {
  usuarioId: string
  listaId: string
  itens: ItemDaLista[]
  /** Quando esta cópia foi lida do servidor. */
  em: number
}

export function guardarLista(usuarioId: string, listaId: string, itens: ItemDaLista[]) {
  try {
    const guardada: Guardada = { usuarioId, listaId, itens, em: Date.now() }
    localStorage.setItem(CHAVE_LISTA, JSON.stringify(guardada))
  } catch {
    // Armazenamento cheio ou bloqueado: a lista só não abre sem sinal, que é
    // como era antes.
  }
}

/** A cópia guardada, se for desta pessoa. Conta trocada não herda lista alheia. */
export function listaGuardada(usuarioId: string): Guardada | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LISTA)
    if (!bruto) return null
    const lida = JSON.parse(bruto) as Guardada
    return lida.usuarioId === usuarioId && Array.isArray(lida.itens) ? lida : null
  } catch {
    return null
  }
}

/** Por item: o instante em que foi pego, ou nulo se foi desmarcado. */
export type Marcas = Record<string, string | null>

export function marcasPendentes(): Marcas {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_MARCAS) ?? '{}') as Marcas
  } catch {
    return {}
  }
}

function gravarMarcas(marcas: Marcas) {
  try {
    localStorage.setItem(CHAVE_MARCAS, JSON.stringify(marcas))
  } catch {
    // Sem onde guardar, a marca vale até fechar o app. Não há o que fazer.
  }
}

/**
 * Guarda uma marca que não conseguiu subir.
 *
 * O instante é o de agora, e não o do envio — a mesma regra do `observado_em`
 * na fila de preços: o que se registra é quando aconteceu.
 */
export function guardarMarca(itemId: string, pego: boolean): Marcas {
  const marcas = {
    ...marcasPendentes(),
    [itemId]: pego ? new Date().toISOString() : null,
  }
  gravarMarcas(marcas)
  return marcas
}

/** A lista como a pessoa a deixou: o que veio do servidor, mais o que ela marcou sem sinal. */
export function comMarcas(itens: ItemDaLista[], marcas: Marcas): ItemDaLista[] {
  return itens.map((i) =>
    i.itemId in marcas ? { ...i, pego: marcas[i.itemId] !== null } : i,
  )
}

/**
 * Sobe as marcas pendentes, uma a uma, e devolve as que ficaram.
 *
 * Em série, como a fila de preços: o sinal do mercado mal aguenta uma
 * requisição. Para na primeira que não chega ao servidor — as outras também
 * não chegariam.
 *
 * Resposta do servidor, qualquer que seja, tira a marca da fila. Sucesso é
 * óbvio; recusa também, porque não muda com o tempo (o item foi apagado em
 * outro aparelho, por exemplo), e reenviá-la para sempre não ajuda ninguém.
 * Só falha de rede, que chega sem código, mantém a marca esperando.
 */
export async function enviarMarcas(): Promise<Marcas> {
  let marcas = marcasPendentes()

  for (const [itemId, pegoEm] of Object.entries(marcas)) {
    const { error } = await supabase
      .from('item_lista')
      .update({ pego_em: pegoEm })
      .eq('id', itemId)

    if (error && !error.code) break

    const { [itemId]: _enviada, ...resto } = marcas
    marcas = resto
    gravarMarcas(marcas)
  }

  return marcas
}
