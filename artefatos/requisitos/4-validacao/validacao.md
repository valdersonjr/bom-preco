# Validação dos Requisitos — Bom Preço

Leitura crítica dos requisitos contra a Visão e o modelo de domínio, sem revisão formal nem
ata, porque não há equipe para revisar.

O SWEBOK avalia requisitos por **completude**, **consistência**, **verificabilidade** e
**rastreabilidade**. É o que foi checado aqui.

**Data:** 22/08/2026 · **Base:** Visão 1.1, modelo de domínio, casos de uso, requisitos
**Resolução:** 22/08/2026 · **Resultado:** 6 de 7 achados resolvidos na Visão 1.2

---

## Resultado

| ID | Achado | Tipo | Grav. | Situação |
| -- | ------ | ---- | :---: | -------- |
| V-01 | O posicionamento promete comparar a cesta inteira, mas RF-22 está fora do MVP | Consistência | Alta | ✅ Resolvido |
| V-02 | A Visão lista "expiração de preço após X dias", mas o modelo decidiu que preço envelhece em vez de expirar | Consistência | Média | ✅ Resolvido |
| V-03 | "Distância e tempo até o mercado" está no escopo e não tem requisito correspondente | Completude | Média | ✅ Resolvido |
| V-04 | O MVP da especificação tinha 17 RF; o da Visão listava 9 itens | Consistência | Média | ✅ Resolvido |
| V-05 | RF-05 exigia busca por similaridade, mas "semelhante" não estava definido | Verificabilidade | Média | ✅ Resolvido |
| V-06 | RNF-11 não tem verificação objetiva | Verificabilidade | Baixa | ✅ Resolvido |
| V-07 | "Diferenciar preço por filial" saiu do escopo funcional sem registro na Visão | Rastreabilidade | Baixa | ✅ Resolvido |

---

## Detalhamento e decisão

### V-01 · O produto prometia mais do que o MVP entrega

A Declaração de Posição do Produto dizia que o Bom Preço mostra onde "cada item da lista —
**ou a cesta inteira** — sai mais barato". RF-22 estava fora do MVP.

São perguntas diferentes: item a item responde "onde cada coisa está mais barata", e pode
espalhar a compra por três mercados; a cesta responde "em qual mercado faço a compra do
mês". A segunda ficou de fora porque somar a lista num mercado exige preço de todos os
itens ali, e base nova não tem isso.

**Decisão.** O posicionamento passou a prometer comparação item a item. RF-22 segue fora do
MVP, como evolução declarada.

### V-02 · Escopo contradizia o modelo de domínio

A Visão listava "expiração de preço não confirmado após X dias". O modelo decidiu o
contrário: preço não expira, envelhece, e a idade é avaliada na consulta (RF-16), não
gravada no dado — o que permite mudar os limites sem migração.

**Decisão.** Item removido do escopo. Prevalece o modelo.

### V-03 · Item de escopo sem requisito

"Distância e tempo até o mercado" seguia no escopo, mas fora descartado na primeira triagem
como *overengineering*, e nenhum RF o realizava.

**Decisão.** Removido do escopo. Item que ninguém pretende construir é dívida silenciosa.

### V-04 · Dois MVPs com contagens diferentes

Quatro requisitos do MVP da especificação não existiam no MVP da Visão: conta e
autenticação, tratamento de item sem código de barras, correção do mercado sugerido e corte
de 30 dias. Todos derivados legítimos, surgidos depois da Visão.

**Decisão.** Acrescentados ao MVP da Visão, que volta a ser o documento que descreve o
lançamento por inteiro.

### V-05 · "Semelhante" não estava definido

RF-05 era a principal defesa contra o R3, mas não dizia o que torna dois produtos
semelhantes. Sem isso, o requisito não era verificável e a mitigação era declaração de
intenção.

**Decisão.** A busca por similaridade foi abandonada. Itens sem código de barras passam a
vir de **catálogo curado pelo autor**, e o usuário apenas seleciona — não cria. Sem criação
livre, não há duplicata a resolver.

Efeitos: RF-04 e RF-05 reescritos, RD-08 reescrito, UC-02 deixa de ser cadastro e vira
seleção, e o R3 cai de probabilidade alta para baixa. Surgiu também RD-09, separando o caso
de produto **com** GTIN ausente da base pública, onde a criação continua permitida porque o
código de barras garante a identidade.

Duas consequências novas: RF-32, pedido de inclusão de item ausente, que no MVP acontece
fora do aplicativo; e uma tarefa de campo — montar o catálogo de Goianésia antes do
lançamento.

### V-06 · Minimização de dados não é objetivamente verificável

RNF-11 diz que só devem ser coletados os dados necessários. Verificar isso exige uma lista
de finalidades que ainda não existe.

**Situação: aberto.** Aceitável nesta fase — o requisito é hoje mais princípio do que
critério. Resolver quando a documentação de conformidade for escrita.

### V-07 · Decisão de escopo sem registro

"Diferenciar preços por filial" deixou de ser funcionalidade e virou consequência do modelo,
onde mercado é a loja e não a rede.

**Decisão.** Removido do escopo funcional. Continua registrado no modelo de domínio, que é
onde a decisão vive.

---

## O que estava sólido

- **Cobertura dos riscos por requisitos.** R3 tem RF-04 e RF-05, R4 tem RF-13, RF-16 e
  RF-24, R6 tem RNF-10 a RNF-12, R9 tem RNF-02. Os riscos sem requisito — R1, R2, R8 e
  R10 — são de adoção e de projeto, não de produto, e não deveriam mesmo ter
- **Rastreabilidade.** Todo RF tem origem declarada; todo caso de uso lista os RF que
  realiza; todo RNF diz onde aterrissa
- **Requisitos derivados separados.** Deixa explícito o que nasceu de decisão interna e
  pode ser revisto se a decisão mudar
- **Quantificação dos não funcionais.** Todos têm método de verificação, com a ressalva do
  V-06

---

---

# Segunda rodada — revisão de engenharia

**Data:** 22/08/2026 · **Base:** Visão 1.2 e todos os artefatos de análise e especificação

Revisão completa após as correções da primeira rodada, incluindo viabilidade técnica dos
requisitos não funcionais. Doze achados; os quatro críticos foram decididos e aplicados na
Visão 1.3.

| ID | Achado | Grav. | Situação |
| -- | ------ | :---: | -------- |
| S-01 | Promoção fora do MVP: preço promocional entraria indistinguível do de prateleira, e a comparação apontaria promoção encerrada | **Crítico** | ✅ Resolvido |
| S-02 | RD-03 proibia auto-confirmação; com poucos usuários nada seria confirmado e a base envelheceria por inteiro em 30 dias | **Crítico** | ✅ Resolvido |
| S-03 | Duplicidade de mercado sem tratamento algum, enquanto duplicidade de produto tinha aparato completo | **Crítico** | ✅ Resolvido |
| S-04 | RD-02, RD-04 e UC-01 se contradiziam sobre correção de registro | **Crítico** | ✅ Resolvido |
| S-05 | RNF-05 dá 15 s para registrar um preço; o orçamento estoura só com carregamento, GPS e chamada à base pública | Alto | ✅ Resolvido |
| S-06 | R1, o maior risco, tem como mitigação o RF-30, que está fora do MVP | Médio | ✅ Resolvido |
| S-07 | Nenhum requisito criava ou mantinha os catálogos que RF-04 e RF-07 pressupõem | Médio | ✅ Resolvido |
| S-08 | §3.1 ainda prometia "indicador de confiabilidade", que está fora do MVP | Médio | ✅ Resolvido |
| S-09 | RF-12 diz "mercados próximos" sem definir raio | Médio | ✅ Resolvido |
| S-10 | Duas métricas do Canvas não são mensuráveis com o que o MVP coleta | Médio | ✅ Resolvido |
| S-11 | R4 citava "expiração automática", contradizendo a decisão de que preço envelhece | Médio | ✅ Resolvido |
| S-12 | Marcos não incluíam a montagem dos catálogos, pré-requisito do lançamento | Médio | ✅ Resolvido |
| S-13 | Premissa errada sobre *shrinkflation* levou o modelo a classificar o adiamento como caro | Alto | ✅ Resolvido |

## Decisões da segunda rodada

### S-01 · Marcação de promoção entra no MVP

RF-11 passou a integrar o MVP, reduzido: um seletor de dois estados, normal ou promocional.
A condição da promoção — "leve 3 pague 2" — virou RF-34 e segue fora, porque era ela que
pesava. O risco real não era deixar de modelar a condição, e sim registrar preço de
promoção como se fosse de prateleira.

### S-02 · Auto-confirmação permitida, com distinção

RD-03 inverteu: confirmar o próprio registro passa a ser permitido e renova a idade, mas
fica marcado como auto-confirmação e vale menos que a de terceiro. O mecanismo original
pressupunha uma densidade de usuários que o lançamento não tem.

### S-03 · Mercados viram catálogo curado

RD-10: mercados são cadastrados pelo mantenedor, e o usuário escolhe da lista. RF-07 perdeu
a permissão de criar mercado novo. É a mesma defesa aplicada aos produtos sem GTIN.

Fontes externas foram descartadas: os termos do Google Maps proíbem armazenar nome e
endereço de lugares — só o `place_id` pode ser guardado —, e o OpenStreetMap tem cobertura
parcial em cidade do interior. Para dez lojas, levantamento manual é mais rápido e exato.

### S-04 · Imutabilidade preservada, correção por novo registro

RD-04 reescrito: vários registros no mesmo dia são permitidos, vale o mais recente, e os
superados ficam gravados mas fora do histórico exibido. Nada é editado nem apagado, o que
mantém RD-02 intacto e resolve o erro de digitação.

### S-07 · Manutenção dos catálogos virou requisito

RF-35 registra a dependência. No MVP a manutenção é feita direto no banco, sem tela — mas
agora está escrito que existe.

### S-12 · Levantamento entrou no cronograma

Novo marco 1: cadastrar mercados e itens sem código de barras de Goianésia. Não é código, e
precede tudo.

### S-05 · O requisito de 15 segundos vira provisório

RNF-05 passou a ser marcado como provisório, com o número a ser fixado após medição em
campo com aparelho real dentro de um mercado. A variável desconhecida é o tempo de fixação
de GPS em ambiente fechado, registrada como risco R11.

### S-06 · O risco de base vazia estava mal formulado

R1 fora escrito no molde de produto de rede, que precisa de massa crítica no lançamento. O
Bom Preço não é isso no começo: o autor é o usuário número um, faz compra toda semana, e
depois de três ou quatro idas já tem histórico próprio suficiente para comparar os mercados
que frequenta. Base vazia no dia 1 não é falha, é dia 1.

O risco real é outro e é posterior — a terceira pessoa chegar e encontrar só os dados do
autor. E a defesa não é requisito, é sequenciamento: usar sozinho algumas semanas e convidar
quando houver o que ver. R1 foi reescrito nesses termos e caiu para impacto médio e
probabilidade média. RF-30 deixa de ser mitigação e volta a ser função opcional.

### S-08 · Posicionamento deixou de prometer o indicador de confiabilidade

A linha "Nosso produto" citava indicador de confiabilidade por preço, que está fora do MVP.
Passou a citar a data em que cada preço foi visto, que é o que existirá no lançamento.

### S-09 · Raio de busca configurável

RF-12 passou a falar em raio escolhido pelo usuário, com a cidade inteira como padrão, e
RF-36 dá o controle. Em Goianésia a distância não é filtro útil; em cidade maior será, e o
requisito já nasce preparado.

### S-10 · Métricas substituídas por medidas que o sistema produz

"Consultas feitas antes da compra" virou consultas por usuário por semana. "Economia
estimada por lista" virou a diferença entre o menor e o maior preço válido de um mesmo
produto — que é mensurável e, além disso, mede exatamente a proposta de valor.

### S-13 · Correção de premissa sobre *shrinkflation*

O modelo de domínio afirmava que *shrinkflation* é a quantidade mudando sob o mesmo GTIN, e
concluía daí que historizar a quantidade desde o início era obrigatório sob pena de perder a
evidência — o único item classificado como custo alto de adiar.

**A premissa está errada.** A regra do GS1 exige novo GTIN sempre que o conteúdo líquido
declarado muda, em qualquer direção. Encolhimento de embalagem aparece como produto novo, e
detectá-lo exige ligar o GTIN antigo ao novo, papel do produto genérico — cujo custo de
adiar o próprio modelo já classificava como baixo.

Consequência: não existe item com custo alto de adiar neste projeto. *Shrinkflation* segue
como objetivo, sem nada a construir agora.

### V-06 · Minimização de dados agora é verificável

A lista de finalidades foi escrita na §6 de `requisitos.md`: cada dado pessoal coletado, a
função que o justifica e a retenção. O RNF-11 passou a ter verificação objetiva — revisar o
esquema contra essa lista.

Duas decisões saíram dela e reduziram a coleta:

- **A coordenada do dispositivo não é persistida.** Dela sobram só o mercado escolhido e o
  indicador de conferência (RD-13, RNF-13). Não existe histórico de deslocamento
- **Entrada sem cadastro.** Conta anônima com apelido gerado, sem e-mail, sem telefone,
  sem nome. E-mail só passa a existir se a pessoa optar por vincular a conta

## Aberto

Nenhum achado em aberto.

---

# Terceira rodada — varredura de coerência

**Data:** 22/08/2026 · **Base:** todos os artefatos, na Visão 1.5

Leitura integral em busca de trecho que tenha ficado para trás depois das duas rodadas
anteriores. Dezessete achados, todos corrigidos na Visão 1.6.

> **Um achado sobre o próprio processo.** O S-11 estava marcado como resolvido nesta
> validação, mas a correção nunca havia sido aplicada: o R4 seguia citando "expiração
> automática", contradizendo o modelo. Marcar resolvido sem aplicar é a falha mais cara que
> um registro de validação pode ter, porque desliga a vigilância sobre o item. Daí a
> necessidade desta terceira passada.

| ID | Achado | Tipo |
| -- | ------ | ---- |
| I-01 | R4 ainda citava expiração automática — S-11 marcado como resolvido sem a correção aplicada | Consistência |
| I-02 | R2 tratava como risco alto o que o R1 reformulado define como plano dos primeiros meses | Consistência |
| I-03 | Stakeholder dizia que os primeiros usuários entram antes de haver base; R1 diz o contrário | Consistência |
| I-04 | R6 descrevia geolocalização armazenada, que RD-13 e RNF-13 proíbem | Consistência |
| I-05 | RD-12 exige exclusão lógica da lista, e a entidade não tinha campo para isso | Completude |
| I-06 | `PRODUTO.origem` não previa produto preenchido pelo usuário, criado por RF-33 | Completude |
| I-07 | Escopo dizia "nome, marca e imagem"; RF-03 diz quantidade; o modelo não tem imagem | Consistência |
| I-08 | Ator descrito como "pessoa autenticada", sem autenticação de entrada desde a Visão 1.5 | Consistência |
| I-09 | Glossário de Confirmação não refletia a distinção entre autor e terceiro | Consistência |
| I-10 | Escopo dizia "confirmação por outro usuário", que RD-03 deixou de exigir | Consistência |
| I-11 | Consultor tinha a responsabilidade de denunciar preço, sem mecanismo no MVP | Rastreabilidade |
| I-12 | Hardware exigia GPS, que passou a ser opcional | Consistência |
| I-13 | R9 dizia que instalação no iOS é limitada, e o R12 depende dela funcionar | Consistência |
| I-14 | Código de origem `Visão` na legenda, sem uso em requisito algum | Higiene |
| I-15 | Requisitos fora de ordem numérica dentro das seções | Higiene |
| I-16 | RF-05 ambíguo entre "criar sem usar código" e "criar produto que não tem código" | Ambiguidade |
| I-17 | MVP enumerado em dois lugares, já divergindo | Duplicação |

**Correções de fundo.** R2 caiu para médio e passou a valer para depois dos convites; R4,
R6 e R9 foram alinhados às decisões vigentes; a entidade `LISTA` ganhou o campo de exclusão
lógica; a enumeração do MVP no Canvas virou ponteiro para a §3.3, para não haver duas
listas divergindo de novo.

Requisitos foram reordenados por número dentro de cada seção, **mantendo os
identificadores** — reordenar linhas não quebra referência, renumerar quebraria.

---

# Quarta rodada — o esquema aplicado

**Data:** 22/08/2026 · **Base:** o banco real, depois da primeira migração

A terceira rodada previu que a construção exporia premissa que o documento não sustenta. Foi
o que aconteceu na primeira hora.

| ID | Achado | Grav. | Situação |
| -- | ------ | :---: | -------- |
| C-01 | A visão `registro_vigente` projeta `usuario_id`, roda com privilégio do dono e recebeu acesso público pelo padrão do banco — a autoria de todos os preços era legível pela API | **Crítico** | ✅ Resolvido |
| C-02 | `TRUNCATE` concedido a papéis de cliente nas tabelas | Médio | ✅ Resolvido |
| C-03 | O desenho tratava a sessão anônima como se fosse o papel `anon`, quando ela chega como `authenticated` | Médio | ✅ Resolvido |

### C-01 · O furo mudou de lugar em vez de fechar

O S-02 corrigiu a exposição de `usuario_id` revogando a leitura da tabela e criando uma visão
que omite a coluna. Só que entre a tabela e a visão pública existe `registro_vigente`, que faz
`select *`. Ela herdou o acesso padrão e continuou legível pela API REST.

Virou regra no design: **visão intermediária que carrega dado sensível precisa ser revogada
junto com a tabela.** Revogar só a tabela empurra o problema uma camada acima.

Nada disso aparecia na leitura do arquivo. Só apareceu quando o esquema encontrou os padrões
reais do banco.

### C-02 e C-03 · Correção da abordagem, não do sintoma

Os dois têm a mesma origem: conceder e revogar caso a caso num banco cujo padrão é conceder
tudo. A segunda migração inverte a lógica — revoga em massa, trava o padrão para tabelas
futuras e concede cada privilégio de propósito. E corrige a premissa sobre papéis: `anon`
deixa de alcançar qualquer coisa, porque o app cria sessão antes de qualquer uso.

---

# Quinta rodada — a interface construída

**Data:** 24/08/2026 · **Base:** o app do marco 4, contra as dez heurísticas de Nielsen

Primeira revisão de interação do projeto. Até aqui a validação olhou documento e esquema; o
app existia, mas ninguém o tinha examinado como interface.

A estrutura era uma rolagem única — escolha de mercado, câmera, formulário, lista, busca,
conta e rodapé empilhados na mesma tela. Aguentava enquanto o app fazia uma coisa. Com as
quatro capacidades do marco 4 prontas, deixou de aguentar.

| ID | Achado | Heurística |
| -- | ------ | ---------- |
| N-01 | Tudo numa rolagem só; nada indicava o que era principal | Estética e minimalismo |
| N-02 | Aviso de preço represado só aparecia dentro da aba de registro | Visibilidade do estado |
| N-03 | Escaneou o produto errado e não havia como sair sem registrar | Controle e liberdade |
| N-04 | Tirar item da lista era silencioso e definitivo, sem desfazer | Controle e liberdade |
| N-05 | "Sua lista está vazia" aparecia antes de a lista carregar | Visibilidade do estado |
| N-06 | "Nenhum produto com esse nome" aparecia durante a busca, mandando escanear produto que existe | Prevenção de erro |
| N-07 | Rótulo da aba divergia do título da seção — "Buscar" abria "Consultar preço" | Consistência |
| N-08 | Barra de navegação fixa sobe com o teclado no Android e cobre o campo | Prevenção de erro |

Todos corrigidos.

### N-01 · Abas na base, não no topo

Quatro seções, uma tarefa cada. Na base porque o app é usado com uma mão só — a outra
empurra o carrinho — e o polegar não alcança o topo de um celular grande.

### N-02 · A fila é do app, não da aba

Achado que a própria reestruturação criou: separar em abas escondeu o aviso de fila de quem
não estivesse registrando. O estado subiu para a casca, e a aba de registro ganhou um
contador. Efeito colateral necessário: um `useEnvio` só no app inteiro, porque dois laços de
esvaziamento disputariam a mesma fila.

### N-04 · Desfazer em vez de confirmar

Confirmação antes de toda ação barata cansa quem acerta para proteger quem erra. Desfazer
inverte a conta: o acerto sai livre, e o erro custa um toque. A confirmação fica onde o dano
é real e irreversível — na exclusão da conta.

### N-05 e N-06 · A tela afirmando o que ainda não sabe

Os dois são o mesmo defeito: estado inicial vazio sendo renderizado como resposta negativa.
O primeiro faz a pessoa achar que perdeu a lista; o segundo manda escanear o código de um
produto que está no banco. Esqueleto de carregamento resolve o primeiro, e uma marca de
"ainda procurando" resolve o segundo.

## O que a revisão não alcança

**Ninguém nunca usou o app em um mercado.** Revisão de heurística encontra defeito de
construção; não encontra o que só aparece com o carrinho na mão, o sinal ruim e a pressa da
fila do caixa. Isso é o marco 5, e nenhuma rodada de validação substitui.

**Preço digitado errado não tem guarda.** Um R$ 5,00 que vira R$ 50,00 passa. É deliberado:
RD-04 já é a resposta desenhada — registra de novo, e o mais recente do dia prevalece. Se o
campo mostrar que o erro é frequente o bastante para enganar quem lê, aí vale um aviso de
implausibilidade. Antes disso seria um limiar inventado sem dado.

**Não há ajuda nem documentação.** Intencional: os estados vazios de cada aba explicam o que
ela faz, e um app de quatro telas que precisa de manual tem outro problema.

---

# Sexta rodada — o sistema visual

**Data:** 24/08/2026 · **Base:** a interface do marco 4, depois da reestruturação em abas

A quinta rodada arrumou a estrutura e deixou a aparência como estava. Um inventário dos
utilitários revelou o que "como estava" significava: **trinta e quatro cores escolhidas uma
a uma**, `rounded-lg` sessenta e duas vezes, nenhuma sombra, e `text-sm` em quarenta e uma
ocorrências contra quatro `text-lg`.

Traduzindo: tudo na tela tinha o mesmo peso. Num app cuja única pergunta é *quanto custa*,
o preço nunca era a maior coisa da tela.

| ID | Achado | Tipo |
| -- | ------ | ---- |
| D-01 | O preço aparecia em `text-sm`, menor que o nome do produto | Hierarquia |
| D-02 | Cor escolhida por matiz em cada componente, sem papel definido | Consistência |
| D-03 | `text-white` sobre cor cheia — quebra assim que a cor clareia no modo escuro | Acessibilidade |
| D-04 | Tinta terciária a 3,64:1, abaixo do mínimo AA de 4,5:1 | Acessibilidade |
| D-05 | Preço formatado em três arquivos, cada um com um tamanho | Duplicação |
| D-06 | Quatro selos por linha de preço, nenhum com precedência sobre os outros | Hierarquia |
| D-07 | Campo de preço — a ação principal do app — do tamanho de um campo de e-mail | Hierarquia |
| D-08 | `theme_color` do manifesto apontava para um verde que não era mais o da marca | Consistência |

Todos corrigidos.

### D-02 · Cor por papel, não por matiz

O componente deixou de escolher a cor e passou a declarar o papel — superfície, tinta,
marca, alerta, perigo. Cento e oitenta e cinco utilitários trocados, e nenhum matiz cru
restante no código.

O ganho não é organização: é que **o modo escuro passou a existir sem tocar em componente
nenhum**. As variáveis trocam de valor sob `prefers-color-scheme`, os utilitários apontam
para elas.

### D-03 · O defeito que só aparece depois

Branco sobre verde escuro é 6,1:1. O mesmo branco sobre o verde clareado do modo escuro é
1,6:1 — ilegível. O par de tokens `sobre-marca`, `sobre-alerta`, `sobre-perigo` e
`sobre-inverso` existe para isso: cada fundo cheio carrega o tom de texto que lhe cabe em
cada tema.

Achado que a própria correção anterior criou, como o N-02 da quinta rodada. Vale registrar
o padrão: **mudança estrutural gera defeito de segunda ordem**, e é ele que escapa.

### D-04 · A auditoria encontrou o que o olho não encontraria

Vinte e seis pares de cor conferidos por cálculo — oklch convertido para RGB linear,
luminância relativa, razão WCAG. Dois reprovaram, ambos na tinta terciária, e o valor
corrigido foi resolvido numericamente até cruzar 4,5:1, não escolhido no olho.

Fica registrado um erro de método no caminho: a primeira versão do cálculo aplicou a curva
gama duas vezes e devolveu razões três vezes maiores que as reais — **todas aprovando**. Uma
auditoria que só aprova é a que merece menos confiança.

## Fundamento das decisões

**O preço tem corpo próprio.** É a única coisa da interface com tamanho declarado em token,
porque é a resposta que o app existe para dar. Lido de relance, de pé, a um braço de
distância. Tabular, para as casas decimais alinharem entre linhas.

**Os centavos não encolhem.** É a tentação tipográfica óbvia e está errada aqui: a diferença
entre R$ 4,99 e R$ 4,89 é exatamente o que se veio comparar.

**Separação por fundo, não por sombra.** A página escureceu um tom e os cartões ficaram
claros. Sombra some na luz de um corredor de supermercado; contraste de fundo, não.

---

# Situação geral

Cinquenta e seis achados em seis rodadas, **todos resolvidos**. Visão na versão 1.9.

Uma pendência de especificação segue registrada em `requisitos.md`, aguardando trabalho de
campo: os números provisórios do tempo máximo de registro e do raio que conta como conferido
no local.

Uma revalidação é devida em dois momentos: quando os catálogos de Goianésia estiverem
montados — o que muda a premissa de RF-04 de "existe uma lista" para "a lista cobre o que as
pessoas compram" — e depois da primeira medição real de tempo de cadastro.

A quinta rodada acrescenta um terceiro momento: **depois do primeiro uso em um corredor de
supermercado**. As quatro rodadas anteriores validaram o que está escrito; esta validou o
que está construído; nenhuma delas validou o que acontece com uma pessoa de pé, segurando o
carrinho.
