import { useCallback, useEffect, useState } from 'react'
import {
  buscarProduto,
  confirmar,
  precosDoProduto,
  type PrecoNoMercado,
  type Posicao,
} from './lib/consulta'
import { Preco } from './Preco'
import { distanciaEmTexto, precoEmTexto } from './lib/formato'
import {
  conferidoNoLocal,
  naCidade,
  useMercados,
  type Mercado,
} from './lib/mercado'
import {
  precoPorUnidade,
  unidadeDeComparacao,
  type Produto,
} from './lib/produto'
import { Historico } from './Historico'
import { Acao, AcaoDeLocalizacao } from './Mercado'
import { descricaoDoProduto, nomeDeProduto } from './lib/texto'
import { useLeitorDeCodigo } from './lib/leitor'
import type { useEnvio } from './lib/envio'
import { montarRegistro, lerValor, type Tipo } from './lib/registro'

/** Padrão: cidade inteira. Ajustável pela pessoa (RF-36). */
const RAIOS = [
  { rotulo: 'A cidade toda', km: null },
  { rotulo: 'Até 2 km', km: 2 },
  { rotulo: 'Até 5 km', km: 5 },
] as const

export function Consulta({
  usuarioId,
  envio,
  aoQuererRegistrar,
}: {
  usuarioId: string
  /** Corrigir preço daqui passa pela mesma fila do cadastro (RNF-06). */
  envio: ReturnType<typeof useEnvio>
  /** Escaneou algo que não está no catálogo: leva para a aba de registro. */
  aoQuererRegistrar: () => void
}) {
  const { mercados, posicao, cidade } = useMercados()
  const daCidade = naCidade(mercados, cidade)
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<Produto[]>([])
  const [produto, setProduto] = useState<Produto | null>(null)
  const [raioKm, setRaioKm] = useState<number | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [foraDoCatalogo, setForaDoCatalogo] = useState<string | null>(null)

  /*
    Escanear para consultar, não só para cadastrar.
    ----------------------------------------------
    No corredor a pessoa está com o produto na mão. Digitar "arroz integral
    fritz & frida" para descobrir se está mais barato em outro lugar é pedir o
    trabalho que o código de barras existe para evitar.

    `buscarProduto` já aceita GTIN — só faltava a câmera alimentá-la.
  */
  const aoLerCodigo = useCallback(async (gtin: string) => {
    setTermo('')
    setAchados([])
    const achado = await buscarProduto(gtin)
    // Código de barras identifica um produto só. Pedir mais um toque para
    // escolher numa lista de um item seria trabalho sem resposta nova.
    if (achado.length > 0) {
      setProduto(achado[0])
      setForaDoCatalogo(null)
    } else {
      setProduto(null)
      setForaDoCatalogo(gtin)
    }
  }, [])

  // Desestruturado, e não guardado como objeto: `leitor.estado` no meio do
  // render faz o lint acusar acesso a ref durante a renderização, porque o
  // objeto carrega o ref do vídeo junto.
  const { video, estado, iniciar, parar } = useLeitorDeCodigo((gtin) =>
    void aoLerCodigo(gtin),
  )

  useEffect(() => {
    let ativo = true
    const id = setTimeout(async () => {
      const r = await buscarProduto(termo)
      if (!ativo) return
      setAchados(r)
      setBuscando(false)
    }, 250)
    return () => {
      ativo = false
      clearTimeout(id)
    }
  }, [termo])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-tinta">Buscar preço</h2>

      <div className="flex gap-2">
        <input
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value)
            setProduto(null)
            setForaDoCatalogo(null)
            setBuscando(true)
          }}
          placeholder="arroz, sabão em pó, tomate…"
          aria-label="Buscar produto pelo nome"
          className="min-h-12 flex-1 rounded-xl border border-borda-forte bg-elevado px-3"
        />
        <button
          type="button"
          onClick={() =>
            estado === 'lendo' ? parar() : void iniciar()
          }
          aria-label={
            estado === 'lendo'
              ? 'Parar a câmera'
              : 'Buscar escaneando o código de barras'
          }
          className={`flex min-h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${
            estado === 'lendo'
              ? 'border-marca bg-marca text-sobre-marca'
              : 'border-borda-forte bg-elevado text-tinta-suave'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
          </svg>
        </button>
      </div>

      <video
        ref={video}
        playsInline
        muted
        className={
          estado === 'lendo'
            ? 'aspect-video w-full rounded-xl bg-black object-cover'
            : 'hidden'
        }
      />

      {estado === 'lendo' && (
        <p className="text-sm text-tinta-suave">
          Aponte para o código de barras do produto.
        </p>
      )}

      {estado === 'negado' && (
        <p className="rounded-xl bg-alerta-fraca p-3 text-alerta-tinta">
          Sem acesso à câmera. Libere a permissão nas configurações do navegador,
          ou busque pelo nome.
        </p>
      )}

      {estado === 'indisponivel' && (
        <p className="rounded-xl bg-alerta-fraca p-3 text-alerta-tinta">
          Este navegador não consegue ler código de barras. Busque pelo nome.
        </p>
      )}

      {foraDoCatalogo && (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-sutil p-4">
          <p className="text-tinta">
            Esse código ainda não está no app.{' '}
            <span className="font-mono text-sm text-tinta-suave">
              {foraDoCatalogo}
            </span>
          </p>
          <p className="text-sm text-tinta-suave">
            Ninguém cadastrou preço para ele em Goianésia. Se você está com o
            produto na mão, é agora que a comparação nasce.
          </p>
          <button
            type="button"
            onClick={aoQuererRegistrar}
            className="min-h-11 rounded-lg bg-marca px-4 font-medium text-sobre-marca"
          >
            Cadastrar o preço
          </button>
        </div>
      )}

      {/*
        Resultados como cartão, e não como texto empilhado.

        Trinta linhas parecidas, sem moldura e sem seta, não pareciam escolhas:
        pareciam uma lista para ler. O que distingue "Arroz Tio João 1 kg" de
        "Arroz Tio João 5 kg" é a segunda linha, então ela precisa ser legível,
        não um rodapé apagado.
      */}
      {!produto && achados.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-tinta-suave">
            {achados.length === 30
              ? 'Mostrando os 30 primeiros. Refine a busca se não achar.'
              : `${achados.length} ${achados.length === 1 ? 'produto' : 'produtos'}`}
          </p>
          <ul className="flex max-h-80 flex-col divide-y divide-borda overflow-y-auto rounded-xl border border-borda bg-elevado">
            {achados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setProduto(p)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-sutil"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-tinta">
                      {nomeDeProduto(p.nome)}
                    </span>
                    <span className="block truncate text-sm text-tinta-suave">
                      {descricaoDoProduto(p)}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-tinta-fraca"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Só afirma que não achou depois de terminar de procurar. Enquanto o
        temporizador de 250 ms corre, `achados` ainda é o resultado do termo
        anterior — e a frase mandaria escanear um produto que existe.
      */}
      {!produto && !buscando && termo.trim().length >= 2 && achados.length === 0 && (
        <p className="rounded-xl bg-sutil p-3 text-tinta">
          Nenhum produto com esse nome. Escaneie o código de barras dele para
          incluir.
        </p>
      )}

      {produto && (
        <Precos
          key={produto.id}
          produto={produto}
          mercados={daCidade}
          posicao={posicao}
          raioKm={raioKm}
          aoTrocarRaio={setRaioKm}
          usuarioId={usuarioId}
          registrar={envio.registrar}
          todosOsMercados={mercados}
          aoVoltar={() => setProduto(null)}
        />
      )}
    </section>
  )
}

function Precos({
  produto,
  mercados,
  posicao,
  raioKm,
  aoTrocarRaio,
  usuarioId,
  registrar,
  todosOsMercados,
  aoVoltar,
}: {
  produto: Produto
  mercados: Mercado[]
  posicao: Posicao | null
  raioKm: number | null
  aoTrocarRaio: (km: number | null) => void
  usuarioId: string
  registrar: ReturnType<typeof useEnvio>['registrar']
  /** Lista completa, não a do raio: a marca de conferido compara com todas. */
  todosOsMercados: Mercado[]
  aoVoltar: () => void
}) {
  const [precos, setPrecos] = useState<PrecoNoMercado[] | null>(null)
  const [mostrarVelhos, setMostrarVelhos] = useState(false)
  // Corrigir um preço muda a lista inteira, inclusive quem é o mais barato.
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    void precosDoProduto(produto.id, mercados, posicao, raioKm).then((r) => {
      if (ativo) setPrecos(r)
    })
    return () => {
      ativo = false
    }
  }, [produto.id, mercados, posicao, raioKm, versao])

  if (precos === null) return <EsqueletoDePrecos />

  const validos = precos.filter((p) => !p.desatualizado)
  const velhos = precos.filter((p) => p.desatualizado)
  const menor = validos[0]?.valor ?? null

  return (
    <div className="flex flex-col gap-4">
      {/*
        Cabeçalho de produto, com a volta para os resultados.

        Escolher um produto era um caminho sem retorno: a lista de resultados
        sumia e só voltava reeditando o texto da busca. Nada na tela dizia que
        se tinha entrado em outra vista, nem como sair dela.
      */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={aoVoltar}
          aria-label="Voltar aos resultados da busca"
          className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-tinta-suave"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0 pt-1.5">
          <h3 className="text-lg leading-tight font-semibold text-tinta">
            {nomeDeProduto(produto.nome)}
          </h3>
          <p className="mt-0.5 text-sm text-tinta-suave">
            {descricaoDoProduto(produto)}
          </p>
        </div>
      </div>

      {validos.length === 0 && velhos.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-sutil p-4">
          <p className="text-tinta">
            Ninguém cadastrou o preço deste produto por aqui ainda.
          </p>
          <p className="text-sm text-tinta-suave">
            Da próxima vez que você vir na prateleira, registre. É assim que a
            comparação nasce.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-tinta-suave">
              {validos.length > 0
                ? `${validos.length} ${validos.length === 1 ? 'mercado' : 'mercados'} com preço recente`
                : 'Nenhum preço dos últimos 30 dias'}
            </p>
            <div className="flex gap-1.5">
              {RAIOS.map((r) => (
                <button
                  key={r.rotulo}
                  type="button"
                  onClick={() => aoTrocarRaio(r.km)}
                  aria-pressed={raioKm === r.km}
                  className={
                    raioKm === r.km
                      ? 'min-h-9 rounded-full bg-inverso px-3 text-sm text-sobre-inverso'
                      : 'min-h-9 rounded-full border border-borda-forte px-3 text-sm text-tinta-suave'
                  }
                >
                  {r.rotulo}
                </button>
              ))}
            </div>
          </div>

          {validos.length > 0 && (
            <ol className="flex flex-col gap-2">
              {validos.map((p, i) => (
                <Linha
                  key={p.registroId}
                  preco={p}
                  produto={produto}
                  maisBarato={i === 0}
                  aMaisQueOMenor={
                    menor !== null && i > 0 ? p.valor - menor : null
                  }
                  usuarioId={usuarioId}
                  registrar={registrar}
                  conferido={conferidoNoLocal(p.mercado, posicao, todosOsMercados)}
                  aoCorrigir={() => setVersao((v) => v + 1)}
                />
              ))}
            </ol>
          )}

          {velhos.length > 0 && !mostrarVelhos && (
            <button
              type="button"
              onClick={() => setMostrarVelhos(true)}
              className="min-h-11 self-start rounded-lg text-sm font-medium text-marca-forte"
            >
              Ver {velhos.length} preço{velhos.length > 1 ? 's' : ''} com mais de
              30 dias
            </button>
          )}

          {mostrarVelhos && (
            <div className="anima-surgir flex flex-col gap-2">
              <p className="text-sm text-tinta-fraca">
                Vistos há mais de 30 dias. Podem ter mudado.
              </p>
              <ol className="flex flex-col gap-2 opacity-70">
                {velhos.map((p) => (
                  <Linha
                    key={p.registroId}
                    preco={p}
                    produto={produto}
                    maisBarato={false}
                    aMaisQueOMenor={null}
                    usuarioId={usuarioId}
                    registrar={registrar}
                    conferido={conferidoNoLocal(p.mercado, posicao, todosOsMercados)}
                    aoCorrigir={() => setVersao((v) => v + 1)}
                  />
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Enquanto os preços chegam, o formato deles já ocupa o lugar. */
function EsqueletoDePrecos() {
  return (
    <ul aria-hidden="true" className="flex animate-pulse flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-28 rounded-xl border border-borda bg-elevado p-4">
          <div className="h-4 w-1/3 rounded bg-sutil-forte" />
          <div className="mt-2 h-3 w-1/2 rounded bg-sutil" />
          <div className="mt-4 h-3 w-2/3 rounded bg-sutil" />
        </li>
      ))}
    </ul>
  )
}

/**
 * Um mercado e o preço dele.
 *
 * A diferença para o mais barato aparece em cada linha que não é a primeira.
 * Sem ela a tela é uma coluna de números que a pessoa subtrai de cabeça, no
 * corredor, com pressa. Com ela a comparação já vem feita.
 */
function Linha({
  preco,
  produto,
  maisBarato,
  aMaisQueOMenor,
  usuarioId,
  registrar,
  conferido,
  aoCorrigir,
}: {
  preco: PrecoNoMercado
  produto: Produto
  maisBarato: boolean
  /** Quanto este custa a mais que o mais barato. Nulo no próprio mais barato. */
  aMaisQueOMenor: number | null
  usuarioId: string
  registrar: ReturnType<typeof useEnvio>['registrar']
  conferido: boolean
  aoCorrigir: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [corrigindo, setCorrigindo] = useState(false)
  const porUnidade = precoPorUnidade(produto, preco.valor)

  // Procedência é metadado, não afirmação sobre o preço. Vira linha de texto
  // discreta; só "mais barato" e "promoção" merecem selo, porque só esses dois
  // dizem algo sobre o número ao lado.
  const procedencia = [
    preco.localConferido && 'conferido no local',
    preco.confirmacoesTerceiros > 0 &&
      `${preco.confirmacoesTerceiros} confirmação${preco.confirmacoesTerceiros > 1 ? 'ões' : ''}`,
  ].filter(Boolean)

  return (
    <li
      className={`rounded-xl border bg-elevado p-4 ${
        maisBarato
          ? 'border-marca-borda border-l-4 border-l-marca bg-marca-fraca'
          : 'border-borda'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-tinta">
            {preco.mercado.nome}
          </p>
          {preco.mercado.endereco && (
            <p className="mt-0.5 truncate text-sm text-tinta-suave">
              {preco.mercado.endereco}
            </p>
          )}
          <p className="mt-0.5 text-sm text-tinta-fraca">
            {descreverIdade(preco.idadeEmDias)}
            {preco.distanciaM !== null && (
              <> · {distanciaEmTexto(preco.distanciaM)}</>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <Preco valor={preco.valor} tom={maisBarato ? 'marca' : 'tinta'} />
          <p className="mt-0.5 text-sm tabular-nums text-tinta-suave">
            {aMaisQueOMenor !== null && aMaisQueOMenor > 0 && (
              <span className="font-medium text-alerta-tinta">
                +{precoEmTexto(aMaisQueOMenor)}
              </span>
            )}
            {aMaisQueOMenor !== null && aMaisQueOMenor > 0 && porUnidade !== null && ' · '}
            {porUnidade !== null && (
              <>
                {precoEmTexto(porUnidade)}/{unidadeDeComparacao(produto)}
              </>
            )}
          </p>
        </div>
      </div>

      {(maisBarato || preco.tipo === 'promocional') && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
          {maisBarato && (
            <span className="rounded-full bg-marca px-2.5 py-1 text-sobre-marca">
              Mais barato
            </span>
          )}
          {preco.tipo === 'promocional' && (
            <span className="rounded-full bg-alerta-fraca px-2.5 py-1 text-alerta-tinta">
              Promoção
            </span>
          )}
        </div>
      )}

      {/*
        O histórico encosta na procedência porque é a mesma conversa: quem viu,
        quando, quantas vezes. Fora da fileira de ações, que fica só com o que
        se pede à pessoa.
      */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-lg text-left text-xs text-tinta-fraca"
      >
        <span className="truncate">
          {procedencia.length > 0 ? procedencia.join(' · ') : 'sem confirmações'}
        </span>
        <span className="flex shrink-0 items-center gap-1 font-medium text-tinta-suave">
          Histórico
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`size-3.5 transition-transform ${aberto ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </button>

      {aberto && (
        <div className="anima-surgir mt-1 border-t border-borda pt-3">
          <Historico
            produto={produto}
            mercadoId={preco.mercado.id}
            mercadoNome={preco.mercado.nome}
          />
        </div>
      )}

      {/*
        Confirmar e corrigir são a mesma pergunta com duas respostas.

        Quem está de frente para a gôndola só tem dois casos: o preço confere,
        ou está diferente. Antes só o primeiro tinha botão, e quem via o preço
        errado precisava trocar de aba, achar o mercado de novo e o produto de
        novo. O caminho mais valioso do app era o mais longo.

        Corrigir não altera nada: cria registro novo, porque preço é imutável
        (RD-02) e o mais recente do dia é o que vale (RD-04).

        As três ações vêm em colunas, ícone sobre rótulo, no formato do cartão
        de local do Google Maps. O que faz esse formato funcionar é que os
        alvos ficam do mesmo tamanho e à mesma distância do polegar. Ele
        substitui o endereço-que-era-link, que dependia de a pessoa adivinhar
        que texto verde se toca.

        "Está diferente" não cabe numa coluna estreita, então vira "Corrigir",
        que diz o que faz. A frase mais gentil sobrevive dentro do formulário.
      */}
      {corrigindo ? (
        <Correcao
          preco={preco}
          produto={produto}
          usuarioId={usuarioId}
          conferido={conferido}
          registrar={registrar}
          aoTerminar={() => {
            setCorrigindo(false)
            aoCorrigir()
          }}
          aoCancelar={() => setCorrigindo(false)}
        />
      ) : (
        <div className="mt-3 flex items-stretch border-t border-borda pt-1">
          <Acao
            rotulo={confirmado ? 'Confirmado' : 'Confere'}
            destaque={!confirmado}
            desabilitado={confirmado}
            onClick={() => {
              void confirmar(preco.registroId, usuarioId).then((r) => {
                if (r.ok) setConfirmado(true)
              })
            }}
          >
            <path d="M20 6 9 17l-5-5" />
          </Acao>

          <Acao rotulo="Corrigir" onClick={() => setCorrigindo(true)}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </Acao>

          <AcaoDeLocalizacao mercado={preco.mercado} />
        </div>
      )}

    </li>
  )
}

/**
 * Corrigir o preço sem sair da consulta.
 *
 * Só o valor e o tipo: produto e mercado já são os da linha, e a hora é agora,
 * porque quem corrige está vendo a etiqueta neste instante. A marca de
 * conferido no local sai do GPS, igual ao cadastro normal.
 */
function Correcao({
  preco,
  produto,
  usuarioId,
  conferido,
  registrar,
  aoTerminar,
  aoCancelar,
}: {
  preco: PrecoNoMercado
  produto: Produto
  usuarioId: string
  conferido: boolean
  registrar: ReturnType<typeof useEnvio>['registrar']
  aoTerminar: () => void
  aoCancelar: () => void
}) {
  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<Tipo>('tabela')
  const [salvando, setSalvando] = useState(false)
  const valor = lerValor(texto)

  return (
    <form
      className="anima-surgir mt-3 flex flex-col gap-3 border-t border-borda pt-3"
      onSubmit={async (e) => {
        e.preventDefault()
        if (valor === null) return
        setSalvando(true)
        await registrar(
          montarRegistro({
            produto,
            mercado: preco.mercado,
            usuarioId,
            valor,
            tipo,
            conferido,
          }),
        )
        aoTerminar()
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-tinta-suave">
          Quanto está agora no {preco.mercado.nome}?
        </span>
        <div className="flex items-center gap-2 rounded-xl border-2 border-borda-forte bg-superficie px-3 focus-within:border-marca">
          <span className="text-tinta-fraca">R$</span>
          <input
            autoFocus
            required
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={preco.valor.toFixed(2).replace('.', ',')}
            className="text-preco-menor min-h-12 w-full bg-transparent tabular-nums outline-none placeholder:font-normal placeholder:text-tinta-fraca"
          />
        </div>
      </label>

      <div className="flex gap-2">
        {(
          [
            ['tabela', 'Normal'],
            ['promocional', 'Promoção'],
          ] as const
        ).map(([valorTipo, rotulo]) => (
          <button
            key={valorTipo}
            type="button"
            onClick={() => setTipo(valorTipo)}
            aria-pressed={tipo === valorTipo}
            className={
              tipo === valorTipo
                ? 'min-h-11 flex-1 rounded-lg bg-marca px-3 text-sm text-sobre-marca'
                : 'min-h-11 flex-1 rounded-lg border border-borda-forte px-3 text-sm text-tinta-suave'
            }
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando || valor === null}
          className="min-h-11 flex-1 rounded-lg bg-marca px-4 font-medium text-sobre-marca disabled:opacity-40"
        >
          {salvando ? 'Salvando…' : 'Salvar correção'}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="min-h-11 rounded-lg px-4 text-sm text-tinta-suave"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function descreverIdade(dias: number): string {
  if (dias === 0) return 'visto hoje'
  if (dias === 1) return 'visto ontem'
  if (dias < 30) return `visto há ${dias} dias`
  return `visto há mais de um mês`
}
