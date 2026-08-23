import { useConviteDeInstalacao } from './lib/instalacao'

export function ConviteDeInstalacao() {
  const convite = useConviteDeInstalacao()

  if (convite.tipo === 'nenhum') return null

  return (
    <aside className="rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="text-green-900">
        Instale o Bom Preço na tela inicial. Além de abrir mais rápido, é o que
        impede o navegador de apagar seus dados depois de alguns dias sem uso.
      </p>

      {convite.tipo === 'instrucao' && (
        <p className="mt-2 text-sm text-green-800">
          Toque em <strong>Compartilhar</strong> na barra de baixo e escolha{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {convite.tipo === 'automatico' && (
          <button
            type="button"
            onClick={convite.instalar}
            className="min-h-11 rounded-lg bg-green-700 px-4 text-white"
          >
            Instalar
          </button>
        )}
        <button
          type="button"
          onClick={convite.dispensar}
          className="min-h-11 rounded-lg px-4 text-green-800 underline"
        >
          Agora não
        </button>
      </div>
    </aside>
  )
}
