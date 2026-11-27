import { supabase } from './supabase'
import { contarRegistro } from './vinculo'
import type { Mercado } from './mercado'
import type { Produto } from './produto'

export type Tipo = 'tabela' | 'promocional'

export type Registro = {
  /** Gerado no dispositivo: é a chave primária, e o que torna o reenvio idempotente. */
  id: string
  produto_id: string
  mercado_id: string
  usuario_id: string
  valor: number
  tipo: Tipo
  local_conferido: boolean
  /** Instante em que o preço foi VISTO, nunca o do envio. */
  observado_em: string
}

/**
 * Monta o registro no momento em que a pessoa salva.
 *
 * `observado_em` é fixado aqui, e não no servidor, por causa da fila offline: um
 * preço visto na quinta e enviado no sábado precisa continuar sendo de quinta.
 * A idade do preço sustenta RF-13 e RF-16, e ela mentiria se o instante fosse o
 * da chegada.
 */
export function montarRegistro(dados: {
  produto: Produto
  mercado: Mercado
  usuarioId: string
  valor: number
  tipo: Tipo
  conferido: boolean
}): Registro {
  return {
    id: crypto.randomUUID(),
    produto_id: dados.produto.id,
    mercado_id: dados.mercado.id,
    usuario_id: dados.usuarioId,
    valor: dados.valor,
    tipo: dados.tipo,
    local_conferido: dados.conferido,
    observado_em: new Date().toISOString(),
  }
}

/** Violação de unicidade no Postgres. */
const JA_EXISTE = '23505'

/**
 * Grava o registro. Nunca atualiza nem apaga: corrigir preço é registrar de
 * novo, e o mais recente do dia prevalece (RD-02, RD-04).
 *
 * Insert puro, e não upsert, por um motivo concreto: o upsert do PostgREST
 * exige privilégio de UPDATE mesmo quando a resolução é ignorar duplicata — e
 * UPDATE é exatamente o que foi revogado para impor a imutabilidade.
 *
 * A idempotência sai de graça: o `id` vem do dispositivo e é chave primária,
 * então reenviar o mesmo item dá violação de unicidade. Esse erro **é** o sinal
 * de que já está gravado, e por isso conta como sucesso. É o que torna seguro o
 * reenvio da fila offline (RNF-06).
 */
export async function enviarRegistro(
  registro: Registro,
): Promise<
  | { ok: true; jaEstava: boolean }
  | { ok: false; motivo: string; recusado: boolean }
> {
  const { error } = await supabase.from('registro_preco').insert(registro)

  if (error && error.code !== JA_EXISTE) {
    return {
      ok: false,
      motivo: error.message,
      recusado: recusaDoBanco(error.code),
    }
  }

  if (!error) contarRegistro()
  return { ok: true, jaEstava: Boolean(error) }
}

/**
 * O banco respondeu e disse não, ou a pergunta nem chegou?
 *
 * A diferença decide o que a fila faz. Rede que caiu volta, e esperar resolve.
 * Regra violada não muda com o tempo: reenviar o mesmo registro dá a mesma
 * recusa para sempre, e como a fila sobe em série, ele segurava todos os que
 * vinham atrás.
 *
 * Recusa é o que o Postgres devolve nas classes 22 (dado inválido) e 23
 * (restrição violada) e no 42501 (política de acesso). Falha de rede chega sem
 * código nenhum; token vencido chega com código do PostgREST, e o cliente o
 * renova sozinho — os dois continuam sendo "tente depois".
 */
function recusaDoBanco(codigo: string | undefined): boolean {
  if (!codigo) return false
  return codigo.startsWith('22') || codigo.startsWith('23') || codigo === '42501'
}

/**
 * O valor digitado está longe demais do último preço conhecido?
 *
 * A vírgula esquecida transforma 12,90 em 1290, e o registro é imutável
 * (RD-02): o engano fica no histórico para sempre. Triplo e terço são folgados
 * de propósito — promoção forte e reajuste grande cabem dentro, e o que sobra
 * fora é quase só erro de digitação.
 *
 * Quem responde "sim" não é barrado: a tela pede um segundo toque e segue.
 * Preço absurdo às vezes é verdadeiro.
 */
export function longeDoEsperado(valor: number, referencia: number | null): boolean {
  if (referencia === null || referencia <= 0) return false
  return valor > referencia * 3 || valor < referencia / 3
}

/** Aceita "12,90" e "12.90"; recusa o resto. */
export function lerValor(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return null
  const n = Number(limpo)
  return n > 0 ? n : null
}
