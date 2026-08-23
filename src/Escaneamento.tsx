import { useCallback, useState } from 'react'
import { useLeitorDeCodigo } from './lib/leitor'
import { buscarPorGtin, type Produto } from './lib/produto'
import { ProdutoNovo } from './ProdutoNovo'
import { EscolhaDeMercado } from './EscolhaDeMercado'
import { EscolhaDoCatalogo } from './EscolhaDoCatalogo'
import { conferidoNoLocal, useMercados, type Mercado } from './lib/mercado'
import { RegistroDePreco } from './RegistroDePreco'
import { useEnvio } from './lib/envio'

type Resultado =
  | { tipo: 'nenhum' }
  | { tipo: 'buscando'; gtin: string }
  | { tipo: 'achado'; produto: Produto }
  | { tipo: 'desconhecido'; gtin: string }
  | { tipo: 'offline'; gtin: string }
  | { tipo: 'erro'; gtin: string }

export function Escaneamento({ usuarioId }: { usuarioId: string }) {
  const [resultado, setResultado] = useState<Resultado>({ tipo: 'nenhum' })
  const { carregando, mercados, sugerido, posicao } = useMercados()
  const [escolhaManual, setEscolhaManual] = useState<Mercado | null>(null)
  const [modo, setModo] = useState<'codigo' | 'catalogo'>('codigo')
  const [salvos, setSalvos] = useState(0)
  const { naFila, enviando, registrar } = useEnvio()

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

  const { video, estado, iniciar, parar } = useLeitorDeCodigo(aoLer)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-neutral-800">Registrar preço</h2>

      <EscolhaDeMercado
        mercados={mercados}
        escolhido={mercado}
        conferido={conferido}
        temPosicao={posicao !== null}
        carregando={carregando}
        aoEscolher={setEscolhaManual}
      />

      <video
        ref={video}
        playsInline
        muted
        className={
          estado === 'lendo' && modo === 'codigo'
            ? 'aspect-video w-full rounded-lg bg-black object-cover'
            : 'hidden'
        }
      />

      {estado === 'negado' && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
          Sem acesso à câmera. Libere a permissão nas configurações do navegador,
          ou digite o código à mão.
        </p>
      )}

      {estado === 'indisponivel' && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
          Este navegador não consegue ler código de barras.
        </p>
      )}

      <div className="flex gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setModo('codigo')}
          className={
            modo === 'codigo'
              ? 'min-h-11 border-b-2 border-green-700 px-3 font-medium text-green-800'
              : 'min-h-11 px-3 text-neutral-600'
          }
        >
          Com código de barras
        </button>
        <button
          type="button"
          onClick={() => {
            parar()
            setModo('catalogo')
          }}
          className={
            modo === 'catalogo'
              ? 'min-h-11 border-b-2 border-green-700 px-3 font-medium text-green-800'
              : 'min-h-11 px-3 text-neutral-600'
          }
        >
          Hortifruti, açougue, padaria
        </button>
      </div>

      {modo === 'catalogo' && (
        <EscolhaDoCatalogo
          aoEscolher={(produto) => setResultado({ tipo: 'achado', produto })}
        />
      )}

      <div className={modo === 'codigo' ? 'flex gap-2' : 'hidden'}>
        {estado === 'lendo' ? (
          <button
            type="button"
            onClick={parar}
            className="min-h-11 rounded-lg px-4 text-green-800 underline"
          >
            Parar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void iniciar()}
            disabled={estado === 'iniciando'}
            className="min-h-11 rounded-lg bg-green-700 px-4 text-white disabled:opacity-60"
          >
            {estado === 'iniciando' ? 'Abrindo câmera…' : 'Escanear'}
          </button>
        )}
      </div>

      {resultado.tipo === 'achado' && mercado && (
        <RegistroDePreco
          produto={resultado.produto}
          mercado={mercado}
          conferido={conferido}
          usuarioId={usuarioId}
          registrar={registrar}
          aoSalvar={() => {
            setSalvos((n) => n + 1)
            setResultado({ tipo: 'nenhum' })
          }}
        />
      )}

      {salvos > 0 && naFila === 0 && (
        <p className="text-green-800">
          {salvos === 1 ? 'Preço salvo.' : `${salvos} preços salvos.`} Pode
          escanear o próximo.
        </p>
      )}

      {naFila > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
          {naFila === 1
            ? 'Um preço aguardando sinal.'
            : `${naFila} preços aguardando sinal.`}{' '}
          {enviando ? 'Enviando…' : 'Sobem sozinhos quando a conexão voltar.'}
        </p>
      )}

      {resultado.tipo === 'desconhecido' ? (
        <ProdutoNovo
          gtin={resultado.gtin}
          aoCriar={(produto) => setResultado({ tipo: 'achado', produto })}
        />
      ) : (
        resultado.tipo !== 'achado' && <Achado resultado={resultado} />
      )}
    </section>
  )
}

function Achado({ resultado }: { resultado: Resultado }) {
  if (resultado.tipo === 'nenhum') return null

  if (resultado.tipo === 'buscando') {
    return <p className="text-neutral-500">Procurando {resultado.gtin}…</p>
  }

  if (resultado.tipo === 'achado') {
    const p = resultado.produto
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-900">{p.nome}</p>
        <p className="text-sm text-green-800">
          {p.marca ? `${p.marca} · ` : ''}
          {p.quantidade} {p.unidade_medida}
        </p>
        <p className="mt-1 text-xs text-green-700">{p.gtin}</p>
      </div>
    )
  }

  const mensagem = {
    desconhecido: 'Não encontrei esse produto. Você poderá preenchê-lo.',
    offline: 'Sem conexão para consultar produto novo. Tente de novo com sinal.',
    erro: 'Encontrei o produto, mas não consegui salvá-lo.',
  }[resultado.tipo]

  return (
    <div className="rounded-lg bg-neutral-100 p-4">
      <p className="text-neutral-800">{mensagem}</p>
      <p className="mt-1 text-xs text-neutral-600">{resultado.gtin}</p>
    </div>
  )
}
