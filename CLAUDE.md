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
| Hospedagem | Cloudflare Pages |

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

## Segredos

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são **públicas por natureza** — aparecem no
navegador de qualquer usuário. O que protege o banco são as políticas de acesso e os
privilégios, não o sigilo delas. Ficam em `.env.local`, fora do repositório; ver
`.env.example`.

A chave de serviço (`service_role`) ignora toda a RLS. **Nunca no cliente, nunca no
repositório, nunca numa mensagem.** Ela só existe na função de servidor que apaga conta.

## Fluxo de trabalho

Uma issue por vez. O corpo dela traz o requisito de origem, as regras que impõe e o critério
de aceitação em caixa marcável — implementar é satisfazer aquelas caixas, nada além.

Issues fora do MVP têm label `pos-mvp` e não devem ser puxadas sem decisão explícita.

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
