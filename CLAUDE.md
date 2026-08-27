# Bom Preço

Comparador colaborativo de preços de supermercado, para Goianésia–GO. As pessoas cadastram
os preços que veem na prateleira, e o app responde onde cada item da lista está mais barato.

Projeto individual. Aplicativo web instalável, sem publicação em loja.

## Stack

| | |
| --- | --- |
| Cliente | React 19 + TypeScript + Vite, como PWA |
| Estilo | Tailwind CSS 4 — sem arquivo de configuração, tudo por `@import "tailwindcss"` |
| Backend | Supabase: Postgres, autenticação e API REST gerada |
| Acesso a dados | `@supabase/supabase-js` direto, sem camada de cache por cima |
| Hospedagem | Vercel |

## Onde as coisas estão

| Caminho | O quê |
| ------- | ----- |
| `artefatos/requisitos/` | Requisitos, modelo de domínio, casos de uso, validação |
| `artefatos/design/design.md` | Decisões de persistência, acesso e tolerância a falhas |
| `supabase/migrations/` | Esquema do banco. É o artefato de design da camada de dados |
| `src/tipos/banco.ts` | Tipos gerados do esquema — **não editar à mão**, rodar `npm run tipos` |
| `src/lib/supabase.ts` | Cliente único do Supabase |

Antes de implementar qualquer coisa, leia o requisito citado na issue. Os identificadores
`RF-xx`, `RNF-xx`, `RD-xx` e `UC-xx` são estáveis e apontam para texto real.

## Comandos

```
npm run dev        # servidor local
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build      # typecheck + build + service worker
npm run tipos      # regenera src/tipos/banco.ts a partir do banco
```

## Invariantes

Estas decisões custaram análise e **não devem ser reinventadas em código**. Se alguma
parecer errada, o caminho é discutir e mudar o documento, não contorná-la.

**Registro de preço é imutável (RD-02).** Nunca `update`, nunca `delete`. Corrigir preço se
faz com registro novo; o mais recente do dia prevalece (RD-04). Nem o mantenedor altera.

**A coordenada do usuário nunca é persistida (RD-13).** O cálculo dos 200 m acontece no
dispositivo, comparando com a coordenada do mercado que já veio do catálogo. Só o booleano
`local_conferido` sobe. Não existe coluna para latitude ou longitude de usuário.

**Autoria de preço não é exposta (RNF-12).** Leitura passa pela visão `preco_publico`.
As tabelas `registro_preco`, `confirmacao` e a visão `registro_vigente` não são legíveis
pelo cliente — a revogação é de privilégio, não só de política.

**O usuário não cria produto sem código de barras nem mercado (RD-08, RD-10).** Esses vêm de
catálogo curado. Com GTIN, criar é permitido, porque o código garante a identidade (RD-09).

**Tabela nova nasce sem privilégio.** O padrão do schema foi invertido de propósito: toda
tabela criada daqui em diante é inacessível até receber `grant` explícito. Isso vai
surpreender na primeira vez — é intencional.

**`observado_em` é o instante em que o preço foi visto, nunca o do envio.** A fila offline
guarda esse valor; usar a hora do envio faz a idade do preço mentir, e a idade sustenta
RF-13 e RF-16.

**O GPS é sinal, nunca porteiro.** Falha de localização não bloqueia registro: o usuário
escolhe o mercado na lista e o registro sai sem a marca de conferido.

**O porquê de uma regra não vai para a tela.** Interface serve para três coisas: rotular o
que se toca, dizer o que aconteceu, e desfazer um erro. A justificativa de uma decisão — por
que só o mantenedor cadastra mercado, por que a autoria não aparece, por que promoção é
marcada — mora no código e nos artefatos, que é onde ela já está.

O teste antes de escrever qualquer frase na tela: **se eu apagar isto, alguém erra?** Se
não, ela sai. Ficam as exceções em que a leitura é a própria decisão — a confirmação do que
é irreversível, e a promessa sobre o dado pessoal que se está pedindo.

Isto vale contra a inclinação natural deste repositório, e é por isso que está escrito: a
mesma disciplina de explicar o porquê que faz o código ser bom faz a interface ser cansativa.
Uma vez o app acumulou 740 palavras de instrução, e metade explicava regras a quem só queria
saber quanto custa.

## Segredos

Dois arquivos de ambiente, lidos por ferramentas diferentes, ambos no gitignore:

| Arquivo | Quem lê | O quê |
| ------- | ------- | ----- |
| `.env.local` | Vite | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `.env` | CLI do Supabase | Resolve os `env()` do `config.toml`, hoje `RESEND_API_KEY` |

`.env.example` documenta os dois. As variáveis com prefixo `VITE_` são **públicas por
natureza** — aparecem no navegador de qualquer usuário, e é por isso que o que protege o
banco são as políticas de acesso e os privilégios, não o sigilo delas.

A chave de serviço (`service_role`) ignora toda a RLS. **Nunca no cliente, nunca no
repositório, nunca numa mensagem, nunca impressa em saída de comando.**

Isso não impede usá-la em operação de manutenção — carregar catálogo, por exemplo. Impede
que ela seja *exposta*. A forma correta é passá-la direto do CLI para a variável de
ambiente, sem nunca renderizá-la:

```bash
export SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys \
  --project-ref qqcdwghjenveajtwvzdi -o json \
  | python3 -c "import sys,json;print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='service_role'))")
```

A distinção importa: a regra é sobre o segredo não vazar, não sobre quem digita o comando.

## Fluxo de trabalho

Uma issue por vez. O corpo dela traz o requisito de origem, as regras que impõe e o critério
de aceitação em caixa marcável — implementar é satisfazer aquelas caixas, nada além.

Issues fora do MVP têm label `pos-mvp` e não devem ser puxadas sem decisão explícita.

### O laço

1. **Pegar** a próxima issue do marco corrente, respeitando as dependências declaradas no
   corpo ("Depende de #N")
2. **Mover para In Progress antes de escrever a primeira linha** — comando abaixo
3. **Implementar** até as caixas do critério de aceitação fecharem
4. **Verificar**: `npm run lint && npm run typecheck && npm run build`
5. **Commitar** com `Closes #N` no corpo

O passo 5 fecha a issue, e o board move o cartão para Done sozinho — a automação nativa do
projeto está ligada. O passo 2 é o único manual, porque não existe evento de "comecei".

**Nunca trabalhar com o cartão parado em Todo.** Quem olha o board precisa ver o que está
em andamento; cartão que pula de Todo direto para Done esconde o trabalho enquanto ele
acontece.

```bash
# Mover a issue N para In Progress
N=1
ITEM=$(gh project item-list 2 --owner valdersonjr --limit 60 --format json \
  --jq ".items[]|select(.content.number==$N)|.id")
gh project item-edit --id "$ITEM" \
  --project-id PVT_kwHOA-Cyus4BhKPF \
  --field-id PVTSSF_lAHOA-Cyus4BhKPFzhgHCuA \
  --single-select-option-id 47fc9ee4
```

Se a issue ficar parcialmente feita, ela **permanece em In Progress** e as caixas já
satisfeitas ficam marcadas no corpo. Só fecha quando todas fecharem.

### Commits

Conventional Commits, tipos em inglês e descrição em português:

```
tipo(escopo): descrição no imperativo, minúscula, sem ponto final
```

Tipos: `feat` `fix` `docs` `refactor` `chore` `test` `build` `ci`
Escopos: `requisitos` `analise` `design` `app` `api` `infra`

**Só o assunto.** Sem corpo descritivo. Referência à issue vai no corpo apenas quando for
para fechá-la: `Closes #12`.

## Definition of Done

- [ ] Todas as caixas do critério de aceitação da issue marcadas
- [ ] `npm run lint`, `npm run typecheck` e `npm run build` passam
- [ ] Nenhum invariante acima violado
- [ ] Se mexeu no esquema: migração nova, nunca editar migração já aplicada
- [ ] Se mexeu no esquema: `npm run tipos` rodado e o resultado commitado
- [ ] Se a decisão mudou o que está documentado: artefato atualizado no mesmo commit
- [ ] Nenhum dado pessoal novo coletado sem entrar na tabela de finalidades da
      especificação, §6

## O que não fazer

- Editar `src/tipos/banco.ts` à mão
- Editar migração já aplicada — criar outra
- Adicionar biblioteca sem necessidade clara; a stack acima é deliberadamente pequena
- Escrever teste de unidade para código que ainda não existe em issue priorizada
- Criar arquivo de documentação novo quando o assunto cabe num que já existe
