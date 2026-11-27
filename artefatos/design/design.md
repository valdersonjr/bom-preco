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
| RD-04 · vale o mais recente do dia | Visão `registro_vigente`, com `distinct on`. Desempata por `observado_em` e depois por `criado_em`: quando os dois instantes observados coincidem — digitar errado e corrigir em seguida — só a ordem de chegada distingue a correção do erro |
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

**A RD-04 não termina na visão.** `preco_publico` devolve o vigente de cada pessoa em cada
dia, que é o recorte certo para o histórico — mas comparar preço é comparar *mercados*, e
oito observações da mesma loja chegam como oito linhas disputando entre si. O último passo,
ficar com a observação mais recente de cada mercado, acontece no cliente, em
`maisRecentePor`.

Ele mora numa função só, e essa é a decisão: estava escrito na consulta e faltava na lista
de compras, de modo que a lista pegava o **menor** valor entre as oito e apontava, como
preço da prateleira, um número de vinte dias atrás. Regra de leitura duplicada diverge do
mesmo jeito que regra de escrita. O lugar natural dela seria uma visão com `distinct on
(produto_id, mercado_id)`; enquanto não existir, existe uma função e não duas cópias.

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
| `rede`, `mercado` | todos | **mantenedor**, ou ativação pelo usuário | **mantenedor** | **mantenedor** |
| `mercado_candidato`, `cidade_atendida` | todos | — | — | — |
| `mercado_confianca` | todos, só o resultado por mercado | — | — | — |
| `produto` | todos | só com GTIN | **mantenedor** | **mantenedor** |
| `registro_preco` | **não** | só como autor | **ninguém** | **ninguém** |
| `confirmacao` | **não** | só como autor | não | não |
| `registro_vigente` | **ninguém** | — | — | — |
| `preco_publico` | todos | — | — | — |
| `meus_registros` | só as próprias linhas | — | — | — |
| `lista`, `item_lista` | só o dono | só o dono | só o dono | só o dono |
| `compra`, `item_compra` | só o dono | só o dono | **ninguém** | só o dono |
| `evento` | **não** | só como autor, ou sem autor | **ninguém** | **ninguém** |

**O usuário ativa mercado, mas não insere em `mercado`.** A política de inserção continua
sendo só do mantenedor. A ativação (RF-54) passa por `ativar_mercado`, uma função com
privilégio do dono que aceita um único argumento — o identificador de um lugar do catálogo
importado — e copia de lá nome, endereço e coordenada. O usuário não fornece texto nenhum, e
a unicidade do identificador faz de duas ativações do mesmo lugar uma linha só. Há um teto
de cinco ativações por pessoa por dia.

O banco não verifica a proximidade: para isso a posição teria de trafegar, e a RD-13 proíbe.
Quem filtra "só os que estão perto" é o aparelho, que baixa o catálogo da cidade inteira e
compara localmente. Em que cidade ele está, descobre do mesmo jeito, contra o centro de cada
cidade em `cidade_atendida`. O que alguém mal-intencionado consegue é ativar de longe um
mercado que existe — nunca inventar um.

**A confiança do mercado é calculada no banco e sai sem autoria.** `mercado_confianca` soma
os sinais da RD-17 e devolve, por mercado, uma de três situações. Ela chama
`confianca_do_usuario`, que lê os registros de cada conta — e essa função **não é concedida a
papel de cliente**: o juízo sobre uma pessoa não sai do banco, nem para ela. Os pesos estão
todos nessa função e no limiar da visão, são provisórios e foram escolhidos sem dado; devem
ser revistos contra o histórico quando houver mais de uma pessoa registrando.

`marcar_local_do_mercado` é a única função do sistema que recebe uma coordenada de usuário.
Só grava onde não há coordenada, tem teto de três por pessoa por dia, e o que guarda é o
local do mercado.

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

**`meus_registros` não reabre o que a revogação fechou.** A pessoa precisa ler o que ela
mesma registrou — para conferir, e para levar uma cópia (RF-51) — e a tabela continua
inalcançável. A visão filtra por `auth.uid()` dentro dela, com `security_barrier`, e não
projeta `usuario_id`: cada sessão alcança só as próprias linhas, e a autoria alheia segue
sem caminho de leitura.

**Lista de compras e compras concluídas são as únicas coisas privadas do sistema.** São
também o dado que mais revela sobre a pessoa — hábito de consumo — e por isso a política é a
mais restrita de todas. A compra concluída (RF-50) entra por uma função do banco,
`concluir_compra`, que grava a compra e esvazia o carrinho numa transação só; ela roda com
os privilégios de quem chama, de modo que as políticas de dono valem dentro dela.

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

O `id` é gerado no dispositivo e é a chave primária da tabela. Reenviar o mesmo item dez
vezes grava uma linha.

**Insert puro, nunca upsert.** O upsert do PostgREST exige privilégio de `update` mesmo
quando a resolução é ignorar duplicata — e `update` é exatamente o que foi revogado para
impor a imutabilidade. Tabela append-only e upsert não convivem.

A idempotência sai de graça sem ele: o reenvio de um id já gravado devolve violação de
unicidade, e **esse erro é o sinal de que já está lá**. O cliente o trata como sucesso.

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

Consulta de preço. Buscar um produto e ver os preços dele exige conexão — está escrito assim
na Visão, entre os itens fora do MVP.

### A lista de compras sem sinal

A lista é a exceção, porque é a tela usada no corredor. O aparelho guarda a última versão
lida do servidor e o perfil de quem está na sessão; sem rede, o app abre com os dois e diz
desde quando a lista não atualiza.

Uma única escrita tem fila própria: a marca de "já peguei". Ela é guardada com o instante em
que aconteceu — a mesma regra do `observado_em` —, aparece na hora e sobe em série quando a
conexão volta, antes de a lista ser relida. Acrescentar item e mudar quantidade continuam
pedindo rede: são coisas de antes de sair de casa.

O perfil guardado só é aceito quando a pergunta ao servidor falha por rede. Se o servidor
responde que a sessão não existe, a cópia local é de uma conta que acabou, e o app não abre
com ela.

### O que fica guardado para funcionar sem sinal

O service worker precacheia o pacote do app por padrão, e o critério para tirar algo de lá
é utilidade offline, não tamanho.

O ponyfill do leitor de código de barras **fica**: ler etiqueta sem sinal é exatamente o
que o RNF-06 protege, e no Safari do iOS não existe API nativa para servir de alternativa.
Ele continua fora do pacote inicial, o que é assunto do RNF-08 — as duas coisas não se
confundem: uma decide o que bloqueia a primeira tela, a outra decide o que sobrevive à
falta de rede.

O Leaflet **sai**. O mapa depende de tiles que vêm do OpenStreetMap, então guardar o código
dele reserva espaço para uma tela que vai abrir vazia de qualquer forma. Sem esse corte o
`generateSW` desfazia pelas costas a divisão de pacotes: o `import()` existia para o mapa
não custar nada a quem nunca o abre, e o service worker o baixava para todo mundo.

---

## Rastreabilidade

A migração implementa RD-01 a RD-15, RNF-04, RNF-12 e RNF-13. A matriz de acesso
implementa RD-02, RD-08, RD-10 e RNF-12. A fila implementa RNF-06 e sustenta RF-08. A função
de servidor de exclusão implementa RF-40 e RD-11.

O que ainda não tem contrapartida no esquema são os requisitos fora do MVP: foto da
etiqueta, reputação, denúncia e gamificação não têm tabela, por decisão de escopo.
