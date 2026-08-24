import { useCallback, useState } from 'react'
import { useLeitorDeCodigo } from './lib/leitor'
import { buscarPorGtin, type Produto } from './lib/produto'
import { ProdutoNovo } from './ProdutoNovo'
import { EscolhaDeMercado } from './EscolhaDeMercado'
import { EscolhaDoCatalogo } from './EscolhaDoCatalogo'
import { conferidoNoLocal, useMercados, type Mercado } from './lib/mercado'
import { RegistroDePreco } from './RegistroDePreco'
import type { useEnvio } from './lib/envio'

type Resultado =
  | { tipo: 'nenhum' }
  | { tipo: 'buscando'; gtin: string }
  | { tipo: 'achado'; produto: Produto }
  | { tipo: 'desconhecido'; gtin: string }
  | { tipo: 'offline'; gtin: string }
  | { tipo: 'erro'; gtin: string }

export function Escaneamento({
  usuarioId,
  envio,
}: {
  usuarioId: string
  /**
   * Vem de cima porque a fila é do app inteiro, não desta aba: o aviso de
   * preço represado precisa aparecer em qualquer tela, e dois `useEnvio` no
   * mesmo app dariam dois laços de esvaziamento disputando a mesma fila.
   */
  envio: ReturnType<typeof useEnvio>
}) {
  const [resultado, setResultado] = useState<Resultado>({ tipo: 'nenhum' })
  const { carregando, mercados, sugerido, posicao } = useMercados()
  const [escolhaManual, setEscolhaManual] = useState<Mercado | null>(null)
  const [modo, setModo] = useState<'codigo' | 'catalogo'>('codigo')
  const [salvos, setSalvos] = useState(0)
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

  const { video, estado, iniciar, parar } = useLeitorDeCodigo(aoLer)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-tinta">Registrar preço</h2>

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
            ? 'aspect-video w-full rounded-lg bg-inverso object-cover'
            : 'hidden'
        }
      />

      {estado === 'negado' && (
        <p className="rounded-xl bg-alerta-fraca p-3 text-alerta-tinta">
          Sem acesso à câmera. Libere a permissão nas configurações do navegador,
          ou digite o código à mão.
        </p>
      )}

      {estado === 'indisponivel' && (
        <p className="rounded-xl bg-alerta-fraca p-3 text-alerta-tinta">
          Este navegador não consegue ler código de barras.
        </p>
      )}

      <div className="flex gap-2 border-b border-borda">
        <button
          type="button"
          onClick={() => setModo('codigo')}
          className={
            modo === 'codigo'
              ? 'min-h-11 border-b-2 border-marca px-3 font-medium text-marca-forte'
              : 'min-h-11 px-3 text-tinta-suave'
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
              ? 'min-h-11 border-b-2 border-marca px-3 font-medium text-marca-forte'
              : 'min-h-11 px-3 text-tinta-suave'
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
            className="min-h-11 rounded-lg px-4 text-marca-forte underline"
          >
            Parar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void iniciar()}
            disabled={estado === 'iniciando'}
            className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca disabled:opacity-60"
          >
            {estado === 'iniciando' ? 'Abrindo câmera…' : 'Escanear'}
          </button>
        )}
      </div>

      <Digitado
        aoConfirmar={(gtin) => void aoLer(gtin)}
        oculto={modo !== 'codigo'}
      />

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
          aoDesistir={() => setResultado({ tipo: 'nenhum' })}
        />
      )}

      {salvos > 0 && naFila === 0 && (
        <p className="text-marca-forte">
          {salvos === 1 ? 'Preço salvo.' : `${salvos} preços salvos.`} Pode
          escanear o próximo.
        </p>
      )}

      {naFila > 0 && (
        <p className="rounded-xl bg-alerta-fraca p-3 text-alerta-tinta">
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

/**
 * Digitar o código à mão.
 *
 * A mensagem de câmera negada já prometia isto, e o campo não existia. Também é
 * a saída quando a etiqueta está amassada, o código não lê no escuro do
 * corredor, ou o aparelho não tem `BarcodeDetector` — os mesmos casos em que a
 * câmera é sinal e não porteiro.
 */
function Digitado({
  aoConfirmar,
  oculto,
}: {
  aoConfirmar: (gtin: string) => void
  oculto: boolean
}) {
  const [texto, setTexto] = useState('')
  const digitos = texto.replace(/\D/g, '')
  // GTIN-8, GTIN-12 (UPC), GTIN-13 (EAN) e GTIN-14. O dígito verificador não é
  // conferido aqui: quem digita errado recebe "não encontrei esse produto", que
  // é a mesma resposta e não precisa de outra explicação.
  const valido = [8, 12, 13, 14].includes(digitos.length)

  return (
    <form
      className={oculto ? 'hidden' : 'flex items-end gap-2'}
      onSubmit={(e) => {
        e.preventDefault()
        if (valido) {
          aoConfirmar(digitos)
          setTexto('')
        }
      }}
    >
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="gtin" className="text-sm text-tinta-suave">
          Ou digite o código
        </label>
        <input
          id="gtin"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="7890300363614"
          className="min-h-11 rounded-lg border border-borda-forte px-3 font-mono"
        />
      </div>
      <button
        type="submit"
        disabled={!valido}
        className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca disabled:opacity-40"
      >
        Buscar
      </button>
    </form>
  )
}

function Achado({ resultado }: { resultado: Resultado }) {
  if (resultado.tipo === 'nenhum') return null

  if (resultado.tipo === 'buscando') {
    return <p className="text-tinta-fraca">Procurando {resultado.gtin}…</p>
  }

  if (resultado.tipo === 'achado') {
    const p = resultado.produto
    return (
      <div className="rounded-xl border border-marca-borda bg-marca-fraca p-4">
        <p className="font-medium text-marca-forte">{p.nome}</p>
        <p className="text-sm text-marca-forte">
          {p.marca ? `${p.marca} · ` : ''}
          {p.quantidade} {p.unidade_medida}
        </p>
        <p className="mt-1 text-xs text-marca-forte">{p.gtin}</p>
      </div>
    )
  }

  const mensagem = {
    desconhecido: 'Não encontrei esse produto. Você poderá preenchê-lo.',
    offline: 'Sem conexão para consultar produto novo. Tente de novo com sinal.',
    erro: 'Encontrei o produto, mas não consegui salvá-lo.',
  }[resultado.tipo]

  return (
    <div className="rounded-xl bg-sutil p-4">
      <p className="text-tinta">{mensagem}</p>
      <p className="mt-1 text-xs text-tinta-suave">{resultado.gtin}</p>
    </div>
  )
}
