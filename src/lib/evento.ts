import { supabase } from './supabase'

/**
 * Eventos de uso (ver a migração `evento_de_uso`).
 *
 * Três funções, uma por evento, em vez de uma genérica que recebe o tipo: a
 * lista é fechada, e cada evento novo é dado novo sobre a pessoa — tem de
 * passar pela tabela de finalidades (§6) antes de ganhar função aqui.
 *
 * Nenhuma delas espera resposta nem avisa falha. Medir o uso não pode custar
 * um milissegundo nem uma mensagem de erro a quem está usando; evento perdido
 * por falta de sinal é uma contagem um pouco menor, não um defeito.
 */
function gravar(linha: {
  tipo: 'consulta_produto' | 'busca_sem_resultado' | 'codigo_fora_do_catalogo'
  usuario_id?: string
  produto_id?: string
  termo?: string
}) {
  // `then` vazio: o cliente só dispara a requisição quando alguém a consome.
  void supabase.from('evento').insert(linha).then(() => {})
}

/** A pessoa abriu os preços de um produto. O único evento com autor. */
export function consultouProduto(usuarioId: string, produtoId: string) {
  gravar({ tipo: 'consulta_produto', usuario_id: usuarioId, produto_id: produtoId })
}

/** A busca não achou nada. Sem autor: é sobre o catálogo, não sobre quem buscou. */
export function buscouSemResultado(termo: string) {
  gravar({ tipo: 'busca_sem_resultado', termo: termo.trim().toLowerCase() })
}

/** O código de barras lido não existe na base. Sem autor, pelo mesmo motivo. */
export function leuCodigoDesconhecido(gtin: string) {
  gravar({ tipo: 'codigo_fora_do_catalogo', termo: gtin })
}
