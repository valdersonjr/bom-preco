import { useCallback, useState } from 'react'
import { useLeitorDeCodigo } from './lib/leitor'
import { buscarPorGtin, type Produto } from './lib/produto'
import { ProdutoNovo } from './ProdutoNovo'
import { EscolhaDeMercado } from './EscolhaDeMercado'
import { EscolhaDoCatalogo } from './EscolhaDoCatalogo'
import {
  conferidoNoLocal,
  type EstadoMercados,
  type Mercado,
} from './lib/mercado'
import { RegistroDePreco } from './RegistroDePreco'
import type { useEnvio } from './lib/envio'

type Resultado =
  | { tipo: 'nenhum' }
  | { tipo: 'buscando'; gtin: string }
  | { tipo: 'achado'; produto: Produto }
  | { tipo: 'desconhecido'; gtin: string }
  | { tipo: 'offline'; gtin: string }
  | { tipo: 'erro'; gtin: string }

/**
 * Registrar preço é uma tarefa de três passos: onde você está, qual produto,
 * quanto custa.
 *
 * Antes os três ficavam na tela ao mesmo tempo, empilhados, e o cartão do
 * produto encontrado aparecia *abaixo* do formulário de preço. Agora a tela tem
 * duas fases: enquanto não há produto, só o que ajuda a escolher um; assim que
 * há, o resto sai e sobra o preço.
 *
 * Sai de verdade, não fica escondido atrás de rolagem. No corredor, cada
 * elemento a mais é uma coisa a mais para o olho descartar.
 */
export function Escaneamento({
  usuarioId,
  locais,
  envio,
}: {
  usuarioId: string
  /**
   * Catálogo de mercados e posição, vindos de cima pelo mesmo motivo da fila:
   * são do app inteiro. Um `useMercados` por aba pedia o GPS de novo a cada
   * troca, com os 8 segundos de espera que isso custa.
   */
  locais: EstadoMercados
  /**
   * Vem de cima porque a fila é do app inteiro, não desta aba: o aviso de
   * preço represado precisa aparecer em qualquer tela, e dois `useEnvio` no
   * mesmo app dariam dois laços de esvaziamento disputando a mesma fila.
   */
  envio: ReturnType<typeof useEnvio>
}) {
  const [resultado, setResultado] = useState<Resultado>({ tipo: 'nenhum' })
  const { carregando, mercados, sugerido, posicao, cidade } = locais
  const [escolhaManual, setEscolhaManual] = useState<Mercado | null>(null)
  const [modo, setModo] = useState<'codigo' | 'catalogo'>('codigo')
  const [salvos, setSalvos] = useState(0)
  const [veioDaCamera, setVeioDaCamera] = useState(false)
  const { naFila, enviando, registrar } = envio

  // Derivado, não guardado: a sugestão chega depois da localização, e guardá-la
  // em estado exigiria um efeito que dispara outro render sem necessidade.
  const mercado = escolhaManual ?? sugerido
  const conferido = mercado ? conferidoNoLocal(mercado, posicao, mercados) : false

  const aoLer = useCallback(async (gtin: string) => {
    setResultado({ tipo: 'buscando', gtin })
    const busca = await buscarPorGtin(gtin)
    setResultado(
      busca.achou
        ? { tipo: 'achado', produto: busca.produto }
        : { tipo: busca.motivo, gtin: busca.gtin },
    )
  }, [])

  const { video, estado, iniciar, parar } = useLeitorDeCodigo((gtin) => {
    setVeioDaCamera(true)
    void aoLer(gtin)
  })

  const recomecar = () => setResultado({ tipo: 'nenhum' })
  const escolhendo =
    resultado.tipo !== 'achado' && resultado.tipo !== 'desconhecido'

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium text-tinta">Registrar preço</h2>

      <Situacao salvos={salvos} naFila={naFila} enviando={enviando} />

      <EscolhaDeMercado
        mercados={mercados}
        escolhido={mercado}
        conferido={conferido}
        posicao={posicao}
        cidade={cidade}
        carregando={carregando}
        aoEscolher={setEscolhaManual}
      />

      {/*
        O vídeo fica montado o tempo todo, apenas oculto. O leitor guarda uma
        referência a ele e chama `play()` assim que a câmera abre; se o elemento
        só existisse depois do clique, a referência chegaria vazia.
      */}
      <Camera
        video={video}
        visivel={escolhendo && modo === 'codigo' && estado === 'lendo'}
      />

      {escolhendo && (
        <>
          <Segmentado
            valor={modo}
            aoTrocar={(m) => {
              if (m === 'catalogo') parar()
              setModo(m)
            }}
          />

          {modo === 'codigo' ? (
            <PorCodigo
              estado={estado}
              iniciar={iniciar}
              parar={parar}
              aoDigitar={(gtin) => {
                setVeioDaCamera(false)
                void aoLer(gtin)
              }}
            />
          ) : (
            <EscolhaDoCatalogo
              aoEscolher={(produto) => {
                setVeioDaCamera(false)
                setResultado({ tipo: 'achado', produto })
              }}
            />
          )}

          <Aviso resultado={resultado} />
        </>
      )}

      {resultado.tipo === 'desconhecido' && (
        <ProdutoNovo
          gtin={resultado.gtin}
          aoCriar={(produto) => setResultado({ tipo: 'achado', produto })}
          aoDesistir={recomecar}
        />
      )}

      {resultado.tipo === 'achado' && mercado && (
        <RegistroDePreco
          produto={resultado.produto}
          mercado={mercado}
          conferido={conferido}
          usuarioId={usuarioId}
          registrar={registrar}
          aoSalvar={() => {
            setSalvos((n) => n + 1)
            recomecar()
            /*
              Quem escaneou vai escanear de novo.

              Uma compra são dez, quinze itens, e voltar ao botão "Escanear"
              entre cada um é um toque por produto gasto em nada. Reabre só
              quando a câmera foi o caminho de entrada: quem digitou o código
              ou veio do catálogo não pediu câmera nenhuma.
            */
            if (veioDaCamera) void iniciar()
          }}
          aoDesistir={recomecar}
        />
      )}
    </section>
  )
}

/** O que já foi salvo e o que ainda não subiu, no alto e em qualquer fase. */
function Situacao({
  salvos,
  naFila,
  enviando,
}: {
  salvos: number
  naFila: number
  enviando: boolean
}) {
  if (naFila > 0) {
    return (
      <p className="anima-surgir rounded-xl bg-alerta-fraca px-4 py-3 text-sm text-alerta-tinta">
        {naFila === 1
          ? 'Um preço aguardando sinal.'
          : `${naFila} preços aguardando sinal.`}{' '}
        {enviando ? 'Enviando agora.' : 'Sobem sozinhos quando a conexão voltar.'}
      </p>
    )
  }

  if (salvos > 0) {
    return (
      <p className="anima-surgir rounded-xl bg-marca-fraca px-4 py-3 text-sm text-marca-forte">
        <strong className="font-medium">
          {salvos === 1 ? 'Preço salvo.' : `${salvos} preços salvos.`}
        </strong>{' '}
        Pode escanear o próximo.
      </p>
    )
  }

  return null
}

/** Alterna entre os dois jeitos de achar um produto. */
function Segmentado({
  valor,
  aoTrocar,
}: {
  valor: 'codigo' | 'catalogo'
  aoTrocar: (v: 'codigo' | 'catalogo') => void
}) {
  const opcoes = [
    { id: 'codigo' as const, rotulo: 'Código de barras' },
    { id: 'catalogo' as const, rotulo: 'Hortifruti e açougue' },
  ]

  return (
    <div
      role="tablist"
      aria-label="Como achar o produto"
      className="flex gap-1 rounded-xl bg-sutil p-1"
    >
      {opcoes.map(({ id, rotulo }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={valor === id}
          onClick={() => aoTrocar(id)}
          className={`min-h-11 flex-1 rounded-lg px-3 text-sm transition-colors ${
            valor === id
              ? 'bg-elevado font-medium text-tinta shadow-sm'
              : 'text-tinta-suave'
          }`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

/**
 * A janela da câmera, com uma moldura no meio.
 *
 * A moldura não recorta nada: o detector lê o quadro inteiro. Ela existe para
 * dizer onde apontar, porque sem referência a pessoa aproxima demais e o código
 * sai de foco.
 */
function Camera({
  video,
  visivel,
}: {
  video: React.RefObject<HTMLVideoElement | null>
  visivel: boolean
}) {
  return (
    <div
      className={
        visivel ? 'relative overflow-hidden rounded-xl bg-black' : 'hidden'
      }
    >
      <video
        ref={video}
        playsInline
        muted
        className="aspect-[4/3] w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-24 w-4/5 rounded-lg border-2 border-white/70" />
      </div>
      <p className="absolute inset-x-0 bottom-0 bg-black/50 p-2 text-center text-sm text-white">
        Aponte para o código de barras
      </p>
    </div>
  )
}

/** Ler pela câmera, ou digitar quando a etiqueta não colabora. */
function PorCodigo({
  estado,
  iniciar,
  parar,
  aoDigitar,
}: {
  estado: ReturnType<typeof useLeitorDeCodigo>['estado']
  iniciar: () => Promise<void>
  parar: () => void
  aoDigitar: (gtin: string) => void
}) {
  const [texto, setTexto] = useState('')
  const digitos = texto.replace(/\D/g, '')
  // GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) e GTIN-14. O dígito verificador não é
  // conferido aqui: quem digita errado recebe "não encontrei esse produto", que
  // é a mesma resposta e não precisa de outra explicação.
  const valido = [8, 12, 13, 14].includes(digitos.length)
  const podeLer = estado !== 'negado' && estado !== 'indisponivel'

  return (
    <div className="flex flex-col gap-3">
      {podeLer &&
        (estado === 'lendo' ? (
          <button
            type="button"
            onClick={parar}
            className="min-h-12 rounded-xl border border-borda-forte px-4 font-medium text-tinta-suave"
          >
            Parar a câmera
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void iniciar()}
            disabled={estado === 'iniciando'}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca px-4 font-medium text-sobre-marca disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
            </svg>
            {estado === 'iniciando' ? 'Abrindo a câmera…' : 'Escanear'}
          </button>
        ))}

      {estado === 'negado' && (
        <p className="rounded-xl bg-alerta-fraca px-4 py-3 text-sm text-alerta-tinta">
          Sem acesso à câmera. Libere nas configurações, ou digite o código.
        </p>
      )}

      {estado === 'indisponivel' && (
        <p className="rounded-xl bg-alerta-fraca px-4 py-3 text-sm text-alerta-tinta">
          Este navegador não lê código de barras. Digite o código abaixo.
        </p>
      )}

      {/* A câmera existe e a permissão foi dada, mas o vídeo não começou. É
          transitório, então o convite é tentar de novo — e não mandar a pessoa
          mexer em configuração que já está certa. */}
      {estado === 'falhou' && (
        <p className="rounded-xl bg-alerta-fraca px-4 py-3 text-sm text-alerta-tinta">
          Não consegui abrir a câmera. Tente de novo, ou digite o código.
        </p>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (valido) {
            aoDigitar(digitos)
            setTexto('')
          }
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="gtin" className="text-sm text-tinta-suave">
            {podeLer ? 'Ou digite o código' : 'Código de barras'}
          </label>
          <input
            id="gtin"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="7890300363614"
            className="min-h-12 rounded-xl border border-borda-forte bg-elevado px-3 font-mono tabular-nums"
          />
        </div>
        <button
          type="submit"
          disabled={!valido}
          className="min-h-12 rounded-xl border border-borda-forte px-4 font-medium text-tinta-suave disabled:opacity-40"
        >
          Buscar
        </button>
      </form>
    </div>
  )
}

/** Só o que deu errado. O que deu certo virou fase, não mensagem. */
function Aviso({ resultado }: { resultado: Resultado }) {
  if (resultado.tipo === 'nenhum' || resultado.tipo === 'achado') return null

  if (resultado.tipo === 'buscando') {
    return (
      <p className="text-sm text-tinta-fraca">
        Procurando <span className="font-mono">{resultado.gtin}</span>…
      </p>
    )
  }

  const mensagem = {
    desconhecido: 'Não encontrei esse produto.',
    offline: 'Sem conexão para consultar produto novo. Tente de novo com sinal.',
    erro: 'Encontrei o produto, mas não consegui salvá-lo aqui.',
  }[resultado.tipo]

  return (
    <div className="rounded-xl bg-sutil px-4 py-3">
      <p className="text-sm text-tinta">{mensagem}</p>
      <p className="mt-0.5 font-mono text-xs text-tinta-fraca">
        {resultado.gtin}
      </p>
    </div>
  )
}
