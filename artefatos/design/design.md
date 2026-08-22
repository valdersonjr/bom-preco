# Design — Bom Preço

Passagem mínima pela área de Design do SWEBOK. Três dos temas que ela chama de
*questões-chave* se aplicam a este sistema; os demais foram dispensados com justificativa.

| Tema | Tratamento |
| ---- | ---------- |
| **Persistência de dados** | [`20260822172146_esquema_inicial.sql`](../../supabase/migrations/20260822172146_esquema_inicial.sql) |
| **Segurança** | Matriz de acesso abaixo, implementada como políticas no mesmo arquivo |
| **Erro e tolerância a falhas** | Fila de reenvio, abaixo |
| Decisões arquiteturais e rationale | Já registrado na Visão §4: cada escolha de tecnologia com o porquê |
| Interação e apresentação | Coberto por RNF-07 e RNF-08 como critério de aceitação, não como documento |
| Concorrência | Não se aplica: registros de preço são imutáveis e independentes, dois usuários gravando o mesmo produto não conflitam |
| Distribuição de componentes | Decidido na Visão: PWA falando com BaaS. Não há o que decompor |
| Estilos arquiteturais, padrões, notações | Retorno baixo. A forma vem dada pelo Supabase, e diagrama de componentes de projeto individual não informa nada que o código não mostre |
| Avaliação de arquitetura (ATAM e afins) | Método para sistema grande com muitos stakeholders |

O artefato de design da camada de dados **é a migração**, não um documento sobre ela.
Escrever os dois criaria duas versões da mesma coisa para divergirem.

---

## 1. Persistência

O esquema deriva direto do modelo de domínio. O que vale destacar é onde as regras de
domínio deixaram de ser texto e viraram estrutura:

| Regra | Como é imposta |
| ----- | -------------- |
| RD-01 · preço pertence à loja | `registro_preco.mercado_id` aponta para `mercado`, nunca para `rede` |
| RD-02 · registro imutável | Ausência de política de `update` e `delete`. Não é convenção: o banco recusa |
| RD-04 · vale o mais recente do dia | Visão `registro_vigente`, com `distinct on` |
| RD-05 e RD-06 · comparação normalizada | Colunas geradas `dimensao` e `quantidade_base`. Impossível gravar produto sem a normalização |
| RD-03 · autoconfirmação marcada | *Trigger* na inserção, para o sinal sobreviver à anonimização da autoria |
| RD-14 · uma confirmação por dia | Restrição única sobre registro, pessoa e dia. O dia é coluna, e não expressão no índice, porque conversão de fuso não é imutável |
| RD-15 · produto único por lista | Restrição única sobre lista e produto |
| RD-08 e RD-10 · usuário não cria produto sem GTIN nem mercado | Políticas de inserção |
| RD-11 · exclusão anonimiza autoria | `on delete set null` em `registro_preco.usuario_id` |
| RD-12 · exclusão lógica da lista | Coluna `excluida_em`, e `on delete cascade` quando a conta some |
| RD-13 · coordenada nunca persistida | Não existe coluna para ela. `local_conferido` é booleano |
| RNF-12 · autoria não exposta | Visão `preco_publico` não projeta `usuario_id` |

**Uma decisão que reforça a RD-13.** O cálculo dos 200 metros acontece **no dispositivo**:
o app já tem a coordenada do mercado, vinda do catálogo, e compara com a própria posição.
Só o booleano sobe. A coordenada do usuário não chega nem a trafegar.

---

## 2. Segurança — matriz de acesso

Escrita anônima é a superfície de ataque real deste sistema.

**O princípio é negar por padrão.** O banco vem configurado para conceder tudo a papéis de
cliente em cada tabela nova. Conceder e revogar caso a caso nesse terreno é insustentável:
basta esquecer uma tabela, ou criar uma depois, para reabrir o problema. Então tudo é
revogado de uma vez, o padrão é travado, e cada privilégio é concedido de propósito.

**Sessão anônima não é o papel `anon`.** Quem faz login anônimo recebe JWT de
`authenticated` — `anon` é para requisição sem sessão nenhuma. Como o app cria a sessão na
primeira abertura, `anon` não precisa alcançar tabela alguma, e não alcança. A matriz abaixo
é toda de `authenticated`.

| Tabela | Ler | Inserir | Alterar | Apagar |
| ------ | --- | ------- | ------- | ------ |
| `perfil` | só o próprio | só o próprio | só o próprio | por função de servidor |
| `rede`, `mercado` | todos | **mantenedor** | **mantenedor** | **mantenedor** |
| `produto` | todos | só com GTIN | **mantenedor** | **mantenedor** |
| `registro_preco` | **não** | só como autor | **ninguém** | **ninguém** |
| `confirmacao` | **não** | só como autor | não | não |
| `registro_vigente` | **ninguém** | — | — | — |
| `preco_publico` | todos | — | — | — |
| `lista`, `item_lista` | só o dono | só o dono | só o dono | só o dono |

Quatro linhas merecem atenção:

**`registro_preco` não aceita alteração de ninguém, nem do mantenedor.** É a RD-02 levada a
sério. Corrigir preço errado se faz com registro novo, o que preserva o histórico e a
auditoria. Se um dia for preciso remover um registro, isso é migração consciente, não
operação de rotina.

**Preço e confirmação não são legíveis diretamente — só através de `preco_publico`.** Aqui
há uma distinção que é fácil errar: **política de acesso decide quais linhas; privilégio
decide se a tabela é alcançável.** Enquanto o cliente puder consultar `registro_preco` pela
API REST gerada, ele enxerga `usuario_id`, e uma visão que omite a coluna não protege coisa
alguma. Por isso o `select` da tabela é revogado e concedido só na visão — é o privilégio,
não a política, que impõe o RNF-12.

Consequência disso: as duas visões rodam com os privilégios do dono, **sem**
`security_invoker`. É deliberado. Com ele, a visão exigiria do chamador o mesmo acesso à
tabela que estamos justamente revogando.

**E é por isso que `registro_vigente` não é alcançável por ninguém.** Ela é intermediária,
existe só para `preco_publico` consumir, e projeta `usuario_id`. Rodando com privilégio do
dono e exposta pela API, ela devolveria a autoria de todos os preços — refazendo, uma camada
acima, exatamente o furo que a revogação da tabela fechou. Visão intermediária que carrega
dado sensível precisa ser revogada junto com a tabela, não só a tabela.

**Lista de compras é a única coisa privada do sistema.** É também o dado que mais revela
sobre a pessoa — hábito de consumo — e por isso a política é a mais restrita das oito.

### Exclusão de conta

RF-40 não cabe numa política: apagar uma conta significa apagar de `auth.users`, o que exige
privilégio de administração que o cliente não tem, e nem deve ter.

O caminho é uma função de servidor, acionada pelo dono da conta, que apaga o usuário com a
chave de serviço. O resto o banco resolve sozinho: `perfil` e `lista` caem por cascata,
enquanto a autoria de preços e confirmações vira nula, preservando o dado coletivo (RD-11).

É a única operação do sistema que precisa de código no servidor.

### O que esta matriz não protege

Um usuário anônimo pode criar quantas contas quiser e inserir preços falsos. Isso é o risco
R10, aceito conscientemente: no volume inicial o custo de fraudar é maior que o benefício, e
reputação e moderação entram se o problema aparecer. A matriz impede escalada de privilégio
e adulteração de histórico, não spam.

---

## 3. Tolerância a falhas — fila de reenvio

Atende RNF-06: nenhum registro iniciado sem conectividade pode ser perdido. É o requisito
derivado da escolha do PWA somada ao sinal ruim dentro do mercado.

### O que entra na fila

O registro completo, pronto para inserção: `id` gerado no dispositivo, produto, mercado,
valor, tipo, marca de conferência e **`observado_em` capturado no momento do registro**.

Esse último ponto é o que mais erra na prática: se o instante for o do envio, um preço visto
na quinta e enviado no sábado entra no banco como preço de sábado, e a idade — que sustenta
RF-13 e RF-16 — passa a mentir.

### Onde fica

IndexedDB, pelo mesmo motivo que a sessão anônima: sobrevive a fechar o app. No iOS depende
do app estar instalado na tela inicial, o que já é o risco R12 e sua mitigação.

### Idempotência

O `id` é gerado no dispositivo e é a chave primária da tabela. O reenvio usa
`insert ... on conflict (id) do nothing`. Reenviar o mesmo item dez vezes grava uma linha.

É por isso que o esquema não usa `gen_random_uuid()` como padrão em `registro_preco`, ao
contrário das outras tabelas: quem manda no identificador é o cliente.

### Quando esvazia

Ao abrir o app, ao evento `online` do navegador e depois de cada envio bem-sucedido —
processando em série, para não disparar dez requisições num sinal que mal aguenta uma.

### Quando falha

O item permanece na fila e a tentativa seguinte usa espera crescente. A interface mostra
quantos registros estão pendentes, porque silêncio aqui é pior que erro: a pessoa precisa
saber que o preço ainda não subiu.

### O que não entra na fila

Consulta. Só o cadastro é protegido contra falta de sinal — está escrito assim na Visão,
entre os itens fora do MVP.

---

## Rastreabilidade

A migração implementa RD-01 a RD-15, RNF-04, RNF-12 e RNF-13. A matriz de acesso
implementa RD-02, RD-08, RD-10 e RNF-12. A fila implementa RNF-06 e sustenta RF-08. A função
de servidor de exclusão implementa RF-40 e RD-11.

O que ainda não tem contrapartida no esquema são os requisitos fora do MVP: foto da
etiqueta, reputação, denúncia e gamificação não têm tabela, por decisão de escopo.
