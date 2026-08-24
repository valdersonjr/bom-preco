import { useConviteDeInstalacao } from './lib/instalacao'

export function ConviteDeInstalacao() {
  const convite = useConviteDeInstalacao()

  if (convite.tipo === 'nenhum') return null

  return (
    <aside className="rounded-xl border border-marca-borda bg-marca-fraca p-4">
      <p className="text-marca-forte">
        Instale o Bom Preço na tela inicial. Além de abrir mais rápido, é o que
        impede o navegador de apagar seus dados depois de alguns dias sem uso.
      </p>

      {convite.tipo === 'instrucao' && (
        <p className="mt-2 text-sm text-marca-forte">
          Toque em <strong>Compartilhar</strong> na barra de baixo e escolha{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {convite.tipo === 'automatico' && (
          <button
            type="button"
            onClick={convite.instalar}
            className="min-h-11 rounded-lg bg-marca px-4 text-sobre-marca"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={convite.dispensar}
          className="min-h-11 rounded-lg px-4 text-marca-forte underline"
        >
          Agora não
        </button>
      </div>
    </aside>
  )
}
