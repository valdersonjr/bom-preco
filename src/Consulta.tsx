import { useEffect, useState } from 'react'
import {
  buscarProduto,
  confirmar,
  precosDoProduto,
  type PrecoNoMercado,
  type Posicao,
} from './lib/consulta'
import { useMercados, type Mercado } from './lib/mercado'
import {
  precoPorUnidade,
  unidadeDeComparacao,
  type Produto,
} from './lib/produto'
import { Historico } from './Historico'

/** Padrão: cidade inteira. Ajustável pela pessoa (RF-36). */
const RAIOS = [
  { rotulo: 'A cidade toda', km: null },
  { rotulo: 'Até 2 km', km: 2 },
  { rotulo: 'Até 5 km', km: 5 },
] as const

export function Consulta({ usuarioId }: { usuarioId: string }) {
  const { mercados, posicao } = useMercados()
  const [termo, setTermo] = useState('')
  const [achados, setAchados] = useState<Produto[]>([])
  const [produto, setProduto] = useState<Produto | null>(null)
  const [raioKm, setRaioKm] = useState<number | null>(null)

  useEffect(() => {
    let ativo = true
    const id = setTimeout(async () => {
      const r = await buscarProduto(termo)
      if (ativo) setAchados(r)
    }, 250)
    return () => {
      ativo = false
      clearTimeout(id)
    }
  }, [termo])

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-neutral-800">Consultar preço</h2>

      <input
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          setProduto(null)
        }}
        placeholder="arroz, sabão em pó, tomate…"
        aria-label="Buscar produto"
        className="min-h-11 rounded-lg border border-neutral-300 px-3"
      />

      {!produto && achados.length > 0 && (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {achados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setProduto(p)}
                className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100"
              >
                <span className="text-neutral-900">{p.nome}</span>
                <span className="block text-sm text-neutral-600">
                  {p.marca ? `${p.marca} · ` : ''}
                  {p.quantidade} {p.unidade_medida}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!produto && termo.trim().length >= 2 && achados.length === 0 && (
        <p className="rounded-lg bg-neutral-100 p-3 text-neutral-800">
          Nenhum produto com esse nome. Escaneie o código de barras dele para
          incluir.
        </p>
      )}

      {produto && (
        <Precos
          key={produto.id}
          produto={produto}
          mercados={mercados}
          posicao={posicao}
          raioKm={raioKm}
          aoTrocarRaio={setRaioKm}
          usuarioId={usuarioId}
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
}: {
  produto: Produto
  mercados: Mercado[]
  posicao: Posicao | null
  raioKm: number | null
  aoTrocarRaio: (km: number | null) => void
  usuarioId: string
}) {
  const [precos, setPrecos] = useState<PrecoNoMercado[] | null>(null)
  const [mostrarVelhos, setMostrarVelhos] = useState(false)

  useEffect(() => {
    let ativo = true
    void precosDoProduto(produto.id, mercados, posicao, raioKm).then((r) => {
      if (ativo) setPrecos(r)
    })
    return () => {
      ativo = false
    }
  }, [produto.id, mercados, posicao, raioKm])

  if (precos === null) return <p className="text-neutral-500">Procurando…</p>

  const validos = precos.filter((p) => !p.desatualizado)
  const velhos = precos.filter((p) => p.desatualizado)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-medium text-neutral-900">{produto.nome}</p>
        <p className="text-sm text-neutral-600">
          {produto.marca ? `${produto.marca} · ` : ''}
          {produto.quantidade} {produto.unidade_medida}
        </p>
      </div>

      <div className="flex gap-1">
        {RAIOS.map((r) => (
          <button
            key={r.rotulo}
            type="button"
            onClick={() => aoTrocarRaio(r.km)}
            aria-pressed={raioKm === r.km}
            className={
              raioKm === r.km
                ? 'min-h-11 rounded-lg bg-neutral-800 px-3 text-sm text-white'
                : 'min-h-11 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-700'
            }
          >
            {r.rotulo}
          </button>
        ))}
      </div>

      {validos.length === 0 && velhos.length === 0 && (
        <p className="rounded-lg bg-neutral-100 p-4 text-neutral-800">
          Ninguém cadastrou o preço deste produto ainda. Da próxima vez que você
          vir na prateleira, registre — é assim que a comparação nasce.
        </p>
      )}

      {validos.length > 0 && (
        <ol className="flex flex-col gap-2">
          {validos.map((p, i) => (
            <Linha
              key={p.registroId}
              preco={p}
              produto={produto}
              maisBarato={i === 0}
              usuarioId={usuarioId}
            />
          ))}
        </ol>
      )}

      {velhos.length > 0 && !mostrarVelhos && (
        <button
          type="button"
          onClick={() => setMostrarVelhos(true)}
          className="min-h-11 self-start rounded-lg px-3 text-sm text-neutral-600 underline"
        >
          Ver {velhos.length} preço{velhos.length > 1 ? 's' : ''} com mais de 30
          dias
        </button>
      )}

      {mostrarVelhos && (
        <ol className="flex flex-col gap-2 opacity-70">
          {velhos.map((p) => (
            <Linha
              key={p.registroId}
              preco={p}
              produto={produto}
              maisBarato={false}
              usuarioId={usuarioId}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function Linha({
  preco,
  produto,
  maisBarato,
  usuarioId,
}: {
  preco: PrecoNoMercado
  produto: Produto
  maisBarato: boolean
  usuarioId: string
}) {
  const [aberto, setAberto] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const porUnidade = precoPorUnidade(produto, preco.valor)
  const real = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`

  return (
    <li
      className={
        maisBarato
          ? 'rounded-lg border-2 border-green-600 bg-green-50 p-3'
          : 'rounded-lg border border-neutral-200 p-3'
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-neutral-900">{preco.mercado.nome}</span>
        <span className="text-lg font-medium text-neutral-900">
          {real(preco.valor)}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 text-sm text-neutral-600">
        {porUnidade !== null && (
          <span>
            {real(porUnidade)} por {unidadeDeComparacao(produto)}
          </span>
        )}
        <span>{descreverIdade(preco.idadeEmDias)}</span>
        {preco.distanciaM !== null && (
          <span>{(preco.distanciaM / 1000).toFixed(1)} km</span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {maisBarato && (
          <span className="rounded bg-green-700 px-2 py-0.5 text-white">
            Mais barato
          </span>
        )}
        {preco.tipo === 'promocional' && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">
            Promoção
          </span>
        )}
        {preco.localConferido && (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
            Conferido no local
          </span>
        )}
        {preco.confirmacoesTerceiros > 0 && (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
            {preco.confirmacoesTerceiros} confirmação
            {preco.confirmacoesTerceiros > 1 ? 'ões' : ''}
          </span>
        )}
        <button
          type="button"
          disabled={confirmado}
          onClick={async () => {
            const r = await confirmar(preco.registroId, usuarioId)
            if (r.ok) setConfirmado(true)
          }}
          className="ml-auto min-h-11 rounded px-2 text-green-800 underline disabled:text-neutral-500 disabled:no-underline"
        >
          {confirmado ? 'Confirmado' : 'Confirmo esse preço'}
        </button>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="min-h-11 rounded px-2 text-green-800 underline"
        >
          {aberto ? 'Fechar histórico' : 'Histórico'}
        </button>
      </div>

      {aberto && (
        <div className="mt-3 border-t border-neutral-200 pt-3">
          <Historico
            produto={produto}
            mercadoId={preco.mercado.id}
            mercadoNome={preco.mercado.nome}
          />
        </div>
      )}
    </li>
  )
}

function descreverIdade(dias: number): string {
  if (dias === 0) return 'visto hoje'
  if (dias === 1) return 'visto ontem'
  if (dias < 30) return `visto há ${dias} dias`
  return `visto há mais de um mês`
}
