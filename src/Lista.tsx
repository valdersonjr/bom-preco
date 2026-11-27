import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acrescentar,
  acrescentarTermo,
  carregarLista,
  concluirCompra,
  costumes,
  desfazerCompra,
  fixarProduto,
  marcarPego,
  mudarQuantidade,
  normalizarTermo,
  obterOuCriarLista,
  recusarOpcao,
  type Costume,
  type ItemDaLista,
} from './lib/lista'
import { buscarProduto, confirmar, type ProdutoAchado } from './lib/consulta'
import {
  comMarcas,
  enviarMarcas,
  guardarLista,
  guardarMarca,
  listaGuardada,
  marcasPendentes,
  type Marcas,
} from './lib/listaLocal'
import {
  conferidoNoLocal,
  distanciaAte,
  escolhaRecente,
  naCidade,
  type EstadoMercados,
  type Mercado,
  type Posicao,
} from './lib/mercado'
import {
  precoPorUnidade,
  unidadeDeComparacao,
  type Produto,
} from './lib/produto'
import { distanciaEmTexto, idadeEmTexto, precoEmTexto } from './lib/formato'
import { Preco } from './Preco'
import { ComoChegar } from './Mercado'
import { MapaDeMercados } from './MapaDeMercados'
import { descricaoDoProduto, nomeDeProduto } from './lib/texto'

export function Lista({
  usuarioId,
  locais,
  aoIrPara,
  aoRegistrar,
}: {
  usuarioId: string
  /** Catálogo de mercados e posição, vindos de cima: um só por app. */
  locais: EstadoMercados
  aoIrPara: (aba: 'buscar' | 'registrar') => void
  /** Abre o registro com o produto já escolhido. */
  aoRegistrar: (produto: Produto) => void
}) {
  const { mercados, cidade, posicao, sugerido } = locais
  const [listaId, setListaId] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemDaLista[] | null>(null)
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<ProdutoAchado[]>([])
  const [removido, setRemovido] = useState<Removido | null>(null)
  const [concluida, setConcluida] = useState<Concluida | null>(null)
  const [aConferir, setAConferir] = useState<AConferir | null>(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  /*
    O que deu errado, se deu. "carregar" é não ter lista para mostrar; "salvar"
    é a lista estar na tela e a última mudança não ter subido. São avisos
    diferentes porque pedem coisas diferentes: tentar de novo, ou refazer o
    toque.
  */
  const [costumeiros, setCostumeiros] = useState<Costume[]>([])
  const [falha, setFalha] = useState<'carregar' | 'salvar' | null>(null)
  const [tentativa, setTentativa] = useState(0)
  /** Marcas de "já peguei" feitas sem sinal, ainda por subir. */
  const [marcas, setMarcas] = useState<Marcas>(marcasPendentes)
  /** Quando a lista na tela foi lida do servidor, se ela veio da cópia local. */
  const [guardadaEm, setGuardadaEm] = useState<number | null>(null)

  /**
   * Sem conseguir falar com o servidor, mostra a última lista que este
   * aparelho viu. Devolve falso quando não há cópia — aí sim é erro.
   */
  const usarGuardada = useCallback((): boolean => {
    const guardada = listaGuardada(usuarioId)
    if (!guardada) return false
    setListaId((atual) => atual ?? guardada.listaId)
    setItens((atuais) => atuais ?? guardada.itens)
    setGuardadaEm(guardada.em)
    return true
  }, [usuarioId])

  // A rede voltou: é a hora de subir as marcas e trocar a cópia pela lista
  // de verdade. Reusa o mesmo gatilho do "Tentar de novo".
  useEffect(() => {
    const aoVoltar = () => setTentativa((n) => n + 1)
    window.addEventListener('online', aoVoltar)
    return () => window.removeEventListener('online', aoVoltar)
  }, [])

  /** Estável de propósito: identidade nova reiniciaria o relógio do desfazer. */
  const dispensar = useCallback(() => setRemovido(null), [])
  const dispensarConcluida = useCallback(() => setConcluida(null), [])
  const dispensarConferencia = useCallback(() => setAConferir(null), [])

  const daCidade = useMemo(() => naCidade(mercados, cidade), [mercados, cidade])

  const recarregar = useCallback(
    async (id: string) => setItens(await carregarLista(id, daCidade)),
    [daCidade],
  )

  /**
   * Toda escrita passa por aqui: faz, recarrega, e avisa se não deu.
   *
   * Recarrega também na falha, sem deixar a segunda falha escapar: a tela pode
   * estar mostrando a mudança que não subiu, e o que está no servidor é a
   * verdade. Se nem recarregar der, a lista que já estava fica onde está.
   */
  const salvar = useCallback(
    async (acao: () => Promise<void>): Promise<boolean> => {
      if (!listaId) return false
      try {
        await acao()
        await recarregar(listaId)
        setFalha(null)
        return true
      } catch {
        setFalha('salvar')
        await recarregar(listaId).catch(() => {})
        return false
      }
    },
    [listaId, recarregar],
  )

  /*
    Dois efeitos, e não um.

    Achar a lista depende só de quem é a pessoa; carregar o conteúdo dela
    depende também de quais mercados existem, e essa segunda coisa chega depois
    — primeiro sem mercado nenhum, depois com o catálogo. Num efeito só, a
    chegada do catálogo refazia a busca da lista no servidor junto.
  */
  useEffect(() => {
    let ativo = true
    obterOuCriarLista(usuarioId)
      .then((id) => {
        if (ativo) setListaId(id)
      })
      .catch(() => {
        if (ativo && !usarGuardada()) setFalha('carregar')
      })
    return () => {
      ativo = false
    }
  }, [usuarioId, tentativa, usarGuardada])

  // Com guarda de cancelamento, e não `recarregar` direto: o catálogo de
  // mercados chega depois da lista, então duas cargas podem estar no ar ao
  // mesmo tempo, e sem a guarda a que voltar por último vence — mesmo sendo a
  // que foi pedida primeiro, com o catálogo ainda vazio.
  useEffect(() => {
    if (!listaId) return
    let ativo = true
    // As marcas feitas sem sinal sobem antes da leitura, para a lista que
    // volta do servidor já vir com elas.
    enviarMarcas()
      .then((restantes) => {
        if (ativo) setMarcas(restantes)
        return carregarLista(listaId, daCidade)
      })
      .then((r) => {
        if (!ativo) return
        setItens(r)
        setFalha(null)
        setGuardadaEm(null)
        // Só guarda depois de o catálogo de mercados ter chegado: a primeira
        // leitura acontece sem ele, e guardaria uma lista inteira "sem preço".
        if (daCidade.length > 0) guardarLista(usuarioId, listaId, r)
      })
      .catch(() => {
        if (ativo && !usarGuardada()) setFalha('carregar')
      })
    return () => {
      ativo = false
    }
  }, [listaId, daCidade, tentativa, usuarioId, usarGuardada])

  // Relido quando uma compra é concluída ou desfeita: é aí que o costume muda.
  useEffect(() => {
    let ativo = true
    void costumes().then((r) => {
      if (ativo) setCostumeiros(r)
    })
    return () => {
      ativo = false
    }
  }, [concluida])

  useEffect(() => {
    let ativo = true
    const t = setTimeout(async () => {
      const r = termo.trim() ? await buscarProduto(termo) : []
      if (ativo) setAchados(r)
    }, 250)
    return () => {
      ativo = false
      clearTimeout(t)
    }
  }, [termo])

  /**
   * Tirar item da lista não pede confirmação: pede desfazer.
   *
   * Confirmação antes de toda ação barata cansa quem acerta para proteger quem
   * erra. Desfazer inverte a conta — o acerto sai livre, e o erro custa um
   * toque. A confirmação fica onde o dano é real, na exclusão da conta.
   */
  async function mudar(item: ItemDaLista, quantidade: number) {
    const salvou = await salvar(() => mudarQuantidade(item.itemId, quantidade))
    setRemovido(
      salvou && quantidade <= 0
        ? {
            produtoId: item.termo ? null : (item.produto?.id ?? null),
            termo: item.termo,
            nome: nomeDoItem(item),
            quantidade: item.quantidade,
          }
        : null,
    )
  }

  /**
   * Concluir não pede confirmação, pelo mesmo motivo de tirar um item: pede
   * desfazer. O toque errado aqui custaria caro — trinta itens somem da lista
   * — e é por isso que o desfazer devolve todos, marcados como estavam.
   *
   * O mercado só vai junto quando se sabe qual é: a pessoa está nele, pelo
   * GPS, ou o escolheu à mão nas últimas horas. Palpite não entra no
   * histórico.
   */
  async function concluir(noCarrinho: ItemDaLista[]) {
    if (!listaId) return
    const mercado =
      sugerido && conferidoNoLocal(sugerido, posicao, mercados)
        ? sugerido
        : escolhaRecente(mercados)

    let compraId: string | null = null
    const salvou = await salvar(async () => {
      compraId = await concluirCompra(listaId, mercado?.id ?? null)
    })
    if (!salvou || !compraId) return

    setCarrinhoAberto(false)
    setConcluida({
      compraId,
      itens: noCarrinho.map((i) => ({
        produtoId: i.termo ? null : (i.produto?.id ?? null),
        termo: i.termo,
        quantidade: i.quantidade,
      })),
    })
  }

  /**
   * Marcar um item dentro do mercado é o melhor momento para confirmar o
   * preço dele: a pessoa acabou de olhar a etiqueta, e a resposta custa um
   * toque. Na tela de consulta ninguém entra com o carrinho na mão.
   *
   * Só pergunta quando sabe onde a pessoa está — GPS conferido, ou mercado
   * escolhido à mão nas últimas horas — e quando existe preço daquele mercado.
   * É a confirmação que mantém o preço dentro dos trinta dias enquanto há
   * pouca gente registrando (RD-03).
   */
  async function marcar(item: ItemDaLista, pego: boolean) {
    /*
      A única escrita que não pode depender de sinal: é feita andando pelo
      corredor. Se não subir, fica guardada no aparelho, aparece marcada na
      hora e sobe quando a rede voltar — sem aviso de erro, porque para quem
      marcou, marcou.
    */
    let salvou = true
    try {
      await marcarPego(item.itemId, pego)
    } catch {
      salvou = false
      setMarcas(guardarMarca(item.itemId, pego))
    }
    if (salvou && listaId) await recarregar(listaId).catch(() => {})
    if (!salvou || !pego || !item.produto || item.termo) return

    const aqui =
      sugerido && conferidoNoLocal(sugerido, posicao, mercados)
        ? sugerido
        : escolhaRecente(mercados)
    const preco = aqui && item.precos.find((p) => p.mercadoId === aqui.id)
    if (preco) {
      setAConferir({
        registroId: preco.registroId,
        valor: preco.valor,
        produto: item.produto,
      })
    }
  }

  /*
    Três grupos, e o que já foi pego desce para o fim.

    Dentro do mercado a lista encolhe conforme você anda, e o que sobra na
    frente é só o que falta. Manter o item pego no lugar, riscado, obriga a
    pular por cima dele em cada corredor.
  */
  const todos = comMarcas(itens ?? [], marcas)
  const noCarrinho = todos.filter((i) => i.pego)
  const aComprar = todos.filter((i) => !i.pego && i.melhor)
  const semPreco = todos.filter((i) => !i.pego && !i.melhor)

  // Só o que não está na lista: sugerir o que já foi acrescentado seria ruído.
  const naLista = new Set(
    todos.map((i) => (i.termo ? `t:${i.termo}` : `p:${i.produto?.id}`)),
  )
  const sugestoes = costumeiros.filter((c) => !naLista.has(c.chave)).slice(0, 8)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-tinta">Lista de compras</h2>

      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Adicionar item…"
        aria-label="Adicionar item à lista"
        className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3"
      />

      {/*
        A primeira linha é o termo como está, sem marca.

        A busca devolve produtos exatos, e isso atende quem tem marca. Quem
        compra o que estiver mais barato só quer dizer "arroz" — e escolher uma
        entre trinta embalagens era adivinhar qual delas teria preço. As duas
        respostas ficam na mesma lista, e a pessoa escolhe a que é a dela.
      */}
      {normalizarTermo(termo).length >= 2 && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-borda bg-elevado p-1">
          <li>
            <button
              type="button"
              onClick={async () => {
                if (!listaId) return
                const salvou = await salvar(() => acrescentarTermo(listaId, termo))
                if (!salvou) return
                setTermo('')
                setAchados([])
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left hover:bg-sutil"
            >
              <span className="min-w-0 flex-1">
                <span className="text-tinta">
                  {nomeDeProduto(normalizarTermo(termo))}
                </span>
                <span className="block text-sm text-tinta-suave">
                  qualquer marca
                </span>
              </span>
            </button>
          </li>
          {achados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={async () => {
                  if (!listaId) return
                  const salvou = await salvar(() => acrescentar(listaId, p.id))
                  // O termo fica quando não salvou: é o que a pessoa vai
                  // tocar de novo, e apagá-lo a faria digitar outra vez.
                  if (!salvou) return
                  setTermo('')
                  setAchados([])
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left hover:bg-sutil"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-tinta">{nomeDeProduto(p.nome)}</span>
                  <span className="block text-sm text-tinta-suave">
                    {descricaoDoProduto(p)}
                  </span>
                </span>
                {p.temPreco && (
                  <span className="shrink-0 rounded-full bg-marca-fraca px-2 py-0.5 text-xs font-medium text-marca-forte">
                    com preço
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        O que a pessoa costuma comprar, a um toque.

        Some enquanto ela digita: aí ela já sabe o que quer, e as duas listas
        juntas disputariam o mesmo espaço. Aparece só com a lista carregada,
        para não oferecer de volta um item que ela já tem.
      */}
      {itens !== null && sugestoes.length > 0 && !termo.trim() && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-suave">Comprados antes</p>
          <ul className="flex flex-wrap gap-2">
            {sugestoes.map((c) => (
              <li key={c.chave}>
                <button
                  type="button"
                  onClick={() =>
                    void salvar(async () => {
                      if (!listaId) return
                      if (c.termo) await acrescentarTermo(listaId, c.termo)
                      else if (c.produto) await acrescentar(listaId, c.produto.id)
                    })
                  }
                  className="min-h-11 rounded-full border border-borda-forte px-4 text-sm text-tinta"
                >
                  + {nomeDeProduto(c.termo ?? c.produto?.nome ?? '')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {aConferir && (
        <Conferencia
          aConferir={aConferir}
          aoConferir={() => {
            void confirmar(aConferir.registroId, usuarioId)
            setAConferir(null)
          }}
          aoMudar={() => aoRegistrar(aConferir.produto)}
          aoDispensar={dispensarConferencia}
        />
      )}

      {concluida && (
        <Desfazer
          marca={concluida}
          texto={
            concluida.itens.length === 1
              ? 'Compra concluída: 1 item.'
              : `Compra concluída: ${concluida.itens.length} itens.`
          }
          aoDesfazer={async () => {
            if (!listaId) return
            const salvou = await salvar(() =>
              desfazerCompra(concluida.compraId, listaId, concluida.itens),
            )
            if (salvou) setConcluida(null)
          }}
          aoDispensar={dispensarConcluida}
        />
      )}

      {removido && (
        <Desfazer
          marca={removido}
          texto={`${removido.nome} saiu da lista.`}
          aoDesfazer={async () => {
            if (!listaId) return
            const salvou = await salvar(async () => {
              if (removido.termo) {
                await acrescentarTermo(listaId, removido.termo, removido.quantidade)
              } else if (removido.produtoId) {
                await acrescentar(listaId, removido.produtoId, removido.quantidade)
              }
            })
            if (salvou) setRemovido(null)
          }}
          aoDispensar={dispensar}
        />
      )}

      {/* A lista veio da cópia do aparelho: os preços são os daquela hora. */}
      {guardadaEm !== null && (
        <p className="text-sm text-tinta-suave">
          Sem atualizar desde{' '}
          {new Date(guardadaEm).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {falha === 'salvar' && (
        <p role="alert" className="rounded-xl bg-alerta-fraca p-3 text-sm text-alerta-tinta">
          Não salvou. Tente de novo.
        </p>
      )}

      {/* Sem lista na tela e sem conseguir buscar: nem esqueleto, que promete
          uma resposta a caminho, nem cartão de primeira vez, que afirma que
          não há nada. */}
      {falha === 'carregar' && itens === null && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl bg-alerta-fraca p-4">
          <p className="text-alerta-tinta">Não consegui carregar sua lista.</p>
          <button
            type="button"
            onClick={() => {
              setFalha(null)
              setTentativa((n) => n + 1)
            }}
            className="min-h-11 rounded-lg bg-marca px-4 text-sm font-medium text-sobre-marca"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {itens === null && falha !== 'carregar' && <Esqueleto />}

      {/* Quem acabou de concluir a compra esvaziou a lista de propósito: o
          cartão de primeira vez, ali, seria apresentar o app a quem já o usa. */}
      {itens?.length === 0 && !concluida && sugestoes.length === 0 && (
        <PrimeiraVez aoIrPara={aoIrPara} />
      )}

      {aComprar.length > 0 && (
        <ul className="flex flex-col gap-2">
          {aComprar.map((i) => (
            <ItemLinha
              key={i.itemId}
              item={i}
              aoFixar={(produtoId) =>
                void salvar(() => fixarProduto(listaId!, i, produtoId))
              }
              aoRecusar={(produtoId) =>
                void salvar(() => recusarOpcao(i, produtoId))
              }
              aoMudar={(q) => void mudar(i, q)}
              aoMarcar={(p) => void marcar(i, p)}
            />
          ))}
        </ul>
      )}

      {semPreco.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-suave">Ainda sem preço</p>
          <ul className="flex flex-col gap-2">
            {semPreco.map((i) => (
              <ItemLinha
                key={i.itemId}
                item={i}
                aoRegistrar={() =>
                  // Item de qualquer marca sem preço não tem produto para
                  // levar junto: o registro abre do começo, na câmera.
                  i.termo || !i.produto
                    ? aoIrPara('registrar')
                    : aoRegistrar(i.produto)
                }
                aoMudar={(q) => void mudar(i, q)}
                aoMarcar={(p) => void marcar(i, p)}
              />
            ))}
          </ul>
        </div>
      )}

      {aComprar.length > 0 && <PorMercado itens={aComprar} posicao={posicao} />}

      {noCarrinho.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCarrinhoAberto((v) => !v)}
            aria-expanded={carrinhoAberto}
            className="flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-tinta-suave"
          >
            No carrinho ({noCarrinho.length})
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-4 transition-transform ${carrinhoAberto ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void concluir(noCarrinho)}
            className="min-h-11 rounded-lg bg-marca px-4 text-sm font-medium text-sobre-marca"
          >
            Concluir compra
          </button>
          </div>
          {carrinhoAberto && (
            <ul className="anima-surgir flex flex-col gap-2">
              {noCarrinho.map((i) => (
                <ItemLinha
                  key={i.itemId}
                  item={i}
                  aoMudar={(q) => void mudar(i, q)}
                  aoMarcar={(p) => void marcar(i, p)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * O que se vê ao abrir o app pela primeira vez.
 *
 * Antes era uma frase cinza dizendo que a lista estava vazia, o que a pessoa já
 * sabia. Quem chega aqui por um link de um conhecido não sabe o que é isto nem
 * qual é o primeiro movimento.
 *
 * Estado vazio é a única tela que todo mundo vê, e por isso o melhor lugar para
 * dizer o que o app faz. Uma frase e dois botões: o que vinha depois — de onde
 * vêm os preços, como a contribuição ajuda quem vem atrás — é a missão do
 * projeto, não instrução, e quem chegou aqui ainda não perguntou isso.
 */
function PrimeiraVez({
  aoIrPara,
}: {
  aoIrPara: (aba: 'buscar' | 'registrar') => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-borda bg-elevado p-5">
      <div>
        <p className="font-medium text-tinta">
          Monte sua lista e veja onde sai mais barato
        </p>
        <p className="mt-1 text-sm text-tinta-suave">
          Vá acrescentando o que precisa. O app mostra onde cada item está mais
          barato.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => aoIrPara('buscar')}
          className="min-h-11 rounded-lg bg-marca px-4 text-sm font-medium text-sobre-marca"
        >
          Ver um preço
        </button>
        <button
          type="button"
          onClick={() => aoIrPara('registrar')}
          className="min-h-11 rounded-lg border border-borda-forte px-4 text-sm font-medium text-tinta-suave"
        >
          Registrar um preço
        </button>
      </div>
    </div>
  )
}

type Removido = {
  produtoId: string | null
  termo: string | null
  nome: string
  quantidade: number
}

/** Como o item se chama na tela: o termo, ou o nome do produto. */
function nomeDoItem(item: ItemDaLista): string {
  return nomeDeProduto(item.termo ?? item.produto?.nome ?? '')
}

/** O preço do item recém-marcado, no mercado onde a pessoa está. */
type AConferir = { registroId: string; valor: number; produto: Produto }

/**
 * A pergunta de um toque sobre o preço do item que acabou de ir para o
 * carrinho. Some sozinha, como o desfazer: ignorar é uma resposta válida, e
 * ela não pode ficar no caminho de quem está andando pelo corredor.
 */
function Conferencia({
  aConferir,
  aoConferir,
  aoMudar,
  aoDispensar,
}: {
  aConferir: AConferir
  aoConferir: () => void
  aoMudar: () => void
  aoDispensar: () => void
}) {
  useEffect(() => {
    const t = setTimeout(aoDispensar, SEGUNDOS_PARA_DESFAZER * 1000)
    return () => clearTimeout(t)
  }, [aConferir, aoDispensar])

  return (
    <div
      role="status"
      className="anima-subir flex items-center justify-between gap-2 rounded-xl bg-inverso p-3 text-sobre-inverso"
    >
      <span className="min-w-0 truncate text-sm">
        {nomeDeProduto(aConferir.produto.nome)} a{' '}
        {precoEmTexto(aConferir.valor)}?
      </span>
      <span className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={aoConferir}
          className="min-h-11 rounded-lg px-3 font-medium text-sobre-inverso underline"
        >
          Confere
        </button>
        <button
          type="button"
          onClick={aoMudar}
          className="min-h-11 rounded-lg px-3 text-sobre-inverso underline"
        >
          Mudou
        </button>
      </span>
    </div>
  )
}

/** A compra recém-concluída, com o que o desfazer precisa devolver à lista. */
type Concluida = {
  compraId: string
  itens: { produtoId: string | null; termo: string | null; quantidade: number }[]
}

/** Sete segundos é o tempo de ler a frase e decidir. Depois some sozinha. */
const SEGUNDOS_PARA_DESFAZER = 7

function Desfazer({
  marca,
  texto,
  aoDesfazer,
  aoDispensar,
}: {
  /** O que foi feito. Trocar de objeto reinicia o relógio. */
  marca: object
  texto: string
  aoDesfazer: () => void
  aoDispensar: () => void
}) {
  useEffect(() => {
    const t = setTimeout(aoDispensar, SEGUNDOS_PARA_DESFAZER * 1000)
    return () => clearTimeout(t)
  }, [marca, aoDispensar])

  return (
    <div
      role="status"
      className="anima-subir flex items-center justify-between gap-2 rounded-xl bg-inverso p-3 text-sobre-inverso"
    >
      <span className="min-w-0 truncate text-sm">{texto}</span>
      <button
        type="button"
        onClick={aoDesfazer}
        className="min-h-11 shrink-0 rounded-lg px-3 font-medium text-sobre-inverso underline"
      >
        Desfazer
      </button>
    </div>
  )
}

/**
 * Esqueleto enquanto a lista carrega.
 *
 * Sem ele a tela afirma "sua lista está vazia" antes de saber se está — uma
 * mentira curta, mas que faz a pessoa achar que perdeu o que tinha.
 */
function Esqueleto() {
  return (
    <ul aria-hidden="true" className="flex animate-pulse flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-16 rounded-xl border border-borda bg-elevado p-3">
          <div className="h-4 w-2/3 rounded bg-sutil-forte" />
          <div className="mt-2 h-3 w-1/2 rounded bg-sutil" />
        </li>
      ))}
    </ul>
  )
}

function ItemLinha({
  item,
  aoMudar,
  aoMarcar,
  aoRegistrar,
  aoFixar,
  aoRecusar,
}: {
  item: ItemDaLista
  aoMudar: (quantidade: number) => void
  aoMarcar: (pego: boolean) => void
  /** Só nos itens sem preço: leva ao registro com este produto. */
  aoRegistrar?: () => void
  /** Só no item de qualquer marca: fica com este produto e mais nenhum. */
  aoFixar?: (produtoId: string) => void
  /** Só no item de qualquer marca: este produto não serve. */
  aoRecusar?: (produtoId: string) => void
}) {
  const { melhor, vencido, produto, termo, opcoes, quantidade, pego } = item
  const nome = nomeDoItem(item)
  const [opcoesAbertas, setOpcoesAbertas] = useState(false)

  return (
    <li
      className={`rounded-xl border p-4 ${
        pego ? 'border-borda bg-superficie' : 'border-borda bg-elevado'
      }`}
    >
      <div className="flex items-start gap-3">
        {/*
          A marca de "já peguei" é a razão de a lista existir dentro do mercado.
          Sem ela a pessoa perde o lugar e confere tudo de novo a cada corredor.
        */}
        <button
          type="button"
          role="checkbox"
          aria-checked={pego}
          onClick={() => aoMarcar(!pego)}
          aria-label={`${pego ? 'Tirar do' : 'Pôr no'} carrinho: ${nome}`}
          /* 44 px de toque (RNF-07) em volta de um círculo de 24. A margem
             negativa devolve ao layout o espaço que a área maior tomaria. */
          className="-mx-2.5 -mt-2 -mb-2.5 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <span
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              pego
                ? 'border-marca bg-marca text-sobre-marca'
                : 'border-borda-forte'
            }`}
          >
          {pego && (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
      <p className={`font-medium ${pego ? 'text-tinta-fraca line-through' : 'text-tinta'}`}>
        {nome}
      </p>
      {/* No item de qualquer marca, a segunda linha diz qual produto foi o
          escolhido: é ele que a pessoa vai procurar na prateleira. */}
      <p className="mt-0.5 text-sm text-tinta-fraca">
        {termo
          ? produto
            ? `${nomeDeProduto(produto.nome)} · ${descricaoDoProduto(produto)}`
            : 'qualquer marca'
          : produto && descricaoDoProduto(produto)}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {melhor ? (
            <>
              <Preco valor={melhor.valor} tamanho="medio" />
              <p className="mt-0.5 truncate text-sm text-tinta-suave">
                {melhor.mercado.nome}
                {quantidade > 1 && (
                  <>
                    {' · '}
                    {precoEmTexto(melhor.valor * quantidade)} no total
                  </>
                )}
              </p>
              {/*
                De quando é o preço, e contra quantos ele ganhou. Sem a segunda
                parte, o único preço conhecido de um produto aparecia igual ao
                que venceu três concorrentes.
              */}
              <p className="mt-0.5 truncate text-sm text-tinta-fraca">
                {melhor.entreQuantos === 1
                  ? 'único preço'
                  : `menor de ${melhor.entreQuantos}`}
                {' · '}
                {idadeEmTexto(melhor.idadeEmDias)}
              </p>
            </>
          ) : (
            /* O espaço do preço não colapsa quando não há preço: a lista
               continua alinhada, e a ausência fica evidente por comparação. */
            aoRegistrar ? (
              <>
                {/* Vencido é referência: tinta fraca, sem o corpo de preço, e
                    a idade colada no número para ninguém ler como atual. */}
                {vencido && (
                  <p className="mb-2 text-sm text-tinta-fraca">
                    {precoEmTexto(vencido.valor)} · {vencido.mercado.nome} ·{' '}
                    {idadeEmTexto(vencido.idadeEmDias)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={aoRegistrar}
                  className="min-h-11 rounded-lg border border-borda-forte px-4 text-sm font-medium text-marca-forte"
                >
                  Registrar preço
                </button>
              </>
            ) : (
              <p className="text-preco-menor font-normal text-tinta-fraca">
                sem preço
              </p>
            )
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => aoMudar(quantidade - 1)}
            aria-label={`Diminuir ${nome}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            −
          </button>
          <span className="w-8 text-center tabular-nums">{quantidade}</span>
          <button
            type="button"
            onClick={() => aoMudar(quantidade + 1)}
            aria-label={`Aumentar ${nome}`}
            className="min-h-11 w-11 rounded-lg border border-borda-forte text-lg text-tinta-suave"
          >
            +
          </button>
        </div>
      </div>

      {/*
        As alternativas do item de qualquer marca.

        O casamento é só por nome, então erra: "arroz" também acha farinha de
        arroz. As duas ações são as duas correções possíveis — "este não é o
        que eu quero" e "é só este que eu quero" — e cada uma ensina o item a
        acertar na próxima vez que a lista abrir.
      */}
      {termo && opcoes.length > 0 && !pego && (
        <>
          <button
            type="button"
            onClick={() => setOpcoesAbertas((v) => !v)}
            aria-expanded={opcoesAbertas}
            className="mt-2 min-h-11 rounded-lg text-sm font-medium text-marca-forte"
          >
            {opcoes.length === 1 ? '1 opção' : `${opcoes.length} opções`}
          </button>
          {opcoesAbertas && (
            <ul className="anima-surgir flex flex-col divide-y divide-borda border-t border-borda">
              {opcoes.map((o) => {
                const porUnidade = precoPorUnidade(o.produto, o.valor)
                return (
                  <li
                    key={`${o.produto.id}|${o.mercado.id}`}
                    className="flex flex-col gap-1 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-tinta">
                        {nomeDeProduto(o.produto.nome)}
                      </span>
                      <span className="shrink-0 tabular-nums text-tinta">
                        {precoEmTexto(o.valor)}
                      </span>
                    </div>
                    <p className="flex justify-between gap-3 text-sm text-tinta-suave">
                      <span className="min-w-0 truncate">
                        {descricaoDoProduto(o.produto)} · {o.mercado.nome}
                      </span>
                      {porUnidade !== null && (
                        <span className="shrink-0 tabular-nums">
                          {precoEmTexto(porUnidade)}/{unidadeDeComparacao(o.produto)}
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => aoFixar?.(o.produto.id)}
                        className="min-h-11 rounded-lg border border-borda-forte px-3 text-sm font-medium text-tinta-suave"
                      >
                        Só este
                      </button>
                      <button
                        type="button"
                        onClick={() => aoRecusar?.(o.produto.id)}
                        className="min-h-11 rounded-lg px-3 text-sm text-tinta-suave"
                      >
                        Não serve
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
        </div>
      </div>
    </li>
  )
}

/**
 * Agrupa por mercado o que já tem preço — o roteiro da compra.
 *
 * Não é o total da cesta: esse é o RF-22, que ficou fora do MVP porque exige
 * cobertura que a base nova não tem. Aqui é só "se você for a este mercado,
 * leva estes itens por este valor".
 *
 * É a única tela do app em que vários mercados aparecem juntos, e por isso a
 * única em que o mapa mostra algo que a lista não mostra: que dois deles ficam
 * na mesma avenida. Vem fechado, porque o mapa custa rede e 42 KB — quem só
 * quer saber quanto vai gastar não paga por isso.
 */
function PorMercado({
  itens,
  posicao,
}: {
  itens: ItemDaLista[]
  posicao: Posicao | null
}) {
  const [mapaAberto, setMapaAberto] = useState(false)

  const grupos = new Map<
    string,
    { mercado: Mercado; total: number; quantos: number }
  >()

  for (const i of itens) {
    if (!i.melhor) continue
    const atual = grupos.get(i.melhor.mercado.id) ?? {
      mercado: i.melhor.mercado,
      total: 0,
      quantos: 0,
    }
    atual.total += i.melhor.valor * i.quantidade
    atual.quantos += 1
    grupos.set(i.melhor.mercado.id, atual)
  }

  const ordenados = [...grupos.values()].sort((a, b) => b.quantos - a.quantos)
  const mercados = ordenados.map((g) => g.mercado)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-borda bg-elevado p-4">
      <p className="font-medium text-tinta">Onde comprar</p>

      <ul className="flex flex-col gap-3">
        {ordenados.map((g) => (
          <li
            key={g.mercado.id}
            className="flex flex-col gap-0.5 border-t border-borda pt-3 first:border-0 first:pt-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate font-medium text-tinta">
                {g.mercado.nome}
              </span>
              <span className="shrink-0 tabular-nums text-tinta">
                {precoEmTexto(g.total)}
              </span>
            </div>
            <p className="text-sm text-tinta-suave">
              {g.quantos} {g.quantos === 1 ? 'item' : 'itens'}
              {distanciaAte(g.mercado, posicao) !== null && (
                <> · {distanciaEmTexto(distanciaAte(g.mercado, posicao)!)}</>
              )}
              {g.mercado.endereco && <> · {g.mercado.endereco}</>}
            </p>
            <ComoChegar mercado={g.mercado} discreto />
          </li>
        ))}
      </ul>

      {/*
        Sem rodapé explicando o agrupamento.

        Ele dizia que cada item vai para o mercado mais barato e que isso pode
        espalhar a compra — a lista logo acima já mostra as duas coisas, com os
        mercados separados e o total de cada um. E terminava avisando que
        comparar a cesta inteira "ainda não existe", que é a issue #27 escrita
        na tela: o backlog não é assunto de quem está montando a compra.
      */}
      {mapaAberto ? (
        <MapaDeMercados mercados={mercados} />
      ) : (
        <button
          type="button"
          onClick={() => setMapaAberto(true)}
          className="min-h-11 self-start rounded-lg text-sm font-medium text-marca-forte"
        >
          Ver no mapa
        </button>
      )}
    </div>
  )
}
