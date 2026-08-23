# Instruções do projeto

Comparador colaborativo de preços de supermercado para Goianésia–GO. PWA em React 19 +
TypeScript + Vite, Tailwind 4, Supabase (Postgres, auth e API REST gerada), hospedado na
Vercel. Projeto individual.

**O contexto completo está em [`CLAUDE.md`](../CLAUDE.md) na raiz — leia antes de começar.**
O que segue é o essencial.

## O laço de trabalho

1. Pegar a próxima issue do marco corrente, respeitando as dependências do corpo
2. **Mover o cartão para In Progress antes de escrever a primeira linha** — o comando está
   no `CLAUDE.md`. Nunca trabalhar com o cartão parado em Todo
3. Implementar até as caixas do critério de aceitação fecharem
4. `npm run lint && npm run typecheck && npm run build`
5. Commitar com `Closes #N` — isso fecha a issue e o board move para Done sozinho

Issue parcialmente feita permanece em In Progress, com as caixas satisfeitas marcadas.

## Antes de implementar

Leia o requisito citado na issue. Os identificadores `RF-xx`, `RNF-xx`, `RD-xx` e `UC-xx`
são estáveis e apontam para texto real em `artefatos/requisitos/`. Implementar é satisfazer
as caixas do critério de aceitação da issue, nada além.

## Invariantes — não reinventar em código

- **Registro de preço é imutável.** Nunca `update`, nunca `delete`. Correção se faz com
  registro novo, e o mais recente do dia prevalece
- **Coordenada de usuário nunca é persistida.** O cálculo de proximidade acontece no
  dispositivo; só o booleano `local_conferido` sobe
- **Autoria de preço não é exposta.** Leitura pela visão `preco_publico`; as tabelas de
  preço e confirmação não são legíveis pelo cliente
- **Usuário não cria produto sem código de barras nem mercado.** Vêm de catálogo curado
- **`observado_em` é o instante em que o preço foi visto**, nunca o do envio
- **GPS é sinal, nunca porteiro.** Falhar não bloqueia o registro
- **Tabela nova nasce sem privilégio** — precisa de `grant` explícito

## Segredos

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são públicas por natureza e ficam em
`.env.local`. A chave `service_role` ignora toda a RLS e **nunca** entra no cliente, no
repositório, numa mensagem ou em saída de comando.

Usá-la em manutenção é permitido; expô-la não. Passe do CLI direto para a variável de
ambiente, sem renderizar — o comando está no `CLAUDE.md`.

## Comandos

```
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm run build      # typecheck + build + service worker
npm run tipos      # regenera src/tipos/banco.ts a partir do banco
```

`src/tipos/banco.ts` é gerado — nunca editar à mão.

## Commits

`tipo(escopo): descrição no imperativo, minúscula, sem ponto final`

Tipos: `feat` `fix` `docs` `refactor` `chore` `test` `build` `ci` ·
Escopos: `requisitos` `analise` `design` `app` `api` `infra`

Só o assunto, sem corpo descritivo. `Closes #N` apenas quando o commit fecha a issue.

## Pronto quando

Critério de aceitação todo marcado, `lint`, `typecheck` e `build` passando, nenhum invariante
violado, e — se o esquema mudou — migração nova mais `npm run tipos` rodado.
