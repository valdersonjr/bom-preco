import { useEffect, useState } from 'react'
import {
  buscarProduto,
  confirmar,
  precosDoProduto,
  type PrecoNoMercado,
  type Posicao,
} from './lib/consulta'
import { Preco } from './Preco'
import { precoEmTexto } from './lib/formato'
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
  const [buscando, setBuscando] = useState(false)

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

      <input
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value)
          setProduto(null)
          setBuscando(true)
        }}
        placeholder="arroz, sabão em pó, tomate…"
        aria-label="Buscar produto"
        className="min-h-11 rounded-lg border border-borda-forte px-3"
      />

      {!produto && achados.length > 0 && (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {achados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setProduto(p)}
                className="min-h-11 w-full rounded-lg px-3 py-2 text-left hover:bg-sutil"
              >
                <span className="text-tinta">{p.nome}</span>
                <span className="block text-sm text-tinta-suave">
                  {p.marca ? `${p.marca} · ` : ''}
                  {p.quantidade} {p.unidade_medida}
                </span>
              </button>
            </li>
          ))}
        </ul>
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

  if (precos === null) return <p className="text-tinta-fraca">Procurando…</p>

  const validos = precos.filter((p) => !p.desatualizado)
  const velhos = precos.filter((p) => p.desatualizado)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-medium text-tinta">{produto.nome}</p>
        <p className="text-sm text-tinta-suave">
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
                ? 'min-h-11 rounded-lg bg-inverso px-3 text-sm text-sobre-inverso'
                : 'min-h-11 rounded-lg border border-borda-forte px-3 text-sm text-tinta-suave'
            }
          >
            {r.rotulo}
          </button>
        ))}
      </div>

      {validos.length === 0 && velhos.length === 0 && (
        <p className="rounded-xl bg-sutil p-4 text-tinta">
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
          className="min-h-11 self-start rounded-lg px-3 text-sm text-tinta-suave underline"
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
          <p className="mt-0.5 text-sm text-tinta-suave">
            {descreverIdade(preco.idadeEmDias)}
            {preco.distanciaM !== null && (
              <> · {(preco.distanciaM / 1000).toFixed(1)} km</>
            )}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <Preco valor={preco.valor} tom={maisBarato ? 'marca' : 'tinta'} />
          {porUnidade !== null && (
            <p className="mt-0.5 text-sm tabular-nums text-tinta-suave">
              {precoEmTexto(porUnidade)} / {unidadeDeComparacao(produto)}
            </p>
          )}
        </div>
      </div>

      {(maisBarato || preco.tipo === 'promocional') && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
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

      {procedencia.length > 0 && (
        <p className="mt-2 text-xs text-tinta-fraca">
          {procedencia.join(' · ')}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-borda pt-1">
        <button
          type="button"
          disabled={confirmado}
          onClick={async () => {
            const r = await confirmar(preco.registroId, usuarioId)
            if (r.ok) setConfirmado(true)
          }}
          className="-ml-2 min-h-11 rounded-lg px-2 text-sm font-medium text-marca-forte disabled:font-normal disabled:text-tinta-fraca"
        >
          {confirmado ? 'Confirmado ✓' : 'Confirmo esse preço'}
        </button>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="-mr-2 min-h-11 rounded-lg px-2 text-sm text-tinta-suave"
        >
          {aberto ? 'Fechar' : 'Histórico'}
        </button>
      </div>

      {aberto && (
        <div className="anima-surgir mt-1 border-t border-borda pt-3">
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
