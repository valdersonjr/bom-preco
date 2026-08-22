# Especificação de Requisitos — Bom Preço

Cumpre o papel de **Software Requirements Specification** na terminologia do SWEBOK, em
formato reduzido: projeto individual, sem cliente externo nem homologação. O papel de
*System Definition Document* — requisitos de alto nível na linguagem do domínio — é
cumprido pela [Visão](../1-elicitacao/visao.md).

Deriva do [brainstorm](../1-elicitacao/brainstorm.md), do
[modelo de domínio](../2-analise/modelo-de-dominio.md) e dos
[casos de uso](../2-analise/casos-de-uso.md).

## Convenções

`RF-xx` funcional · `RNF-xx` não funcional · `RD-xx` regra de domínio · `UC-xx` caso de uso

Cada requisito carrega os atributos que o SWEBOK recomenda manter: **origem**, para
rastreabilidade até quem ou o que o motivou; **prioridade**, aqui expressa pela inclusão no
MVP; e, para os não funcionais, o **método de verificação**.

User stories não vivem neste documento. São fatiamento de trabalho, ficam no backlog e
referenciam o `RF-xx` de origem.

**Códigos de origem**

| Código | Significado |
| ------ | ----------- |
| `Elic` | Levantado no brainstorm de elicitação |
| `Dom` | Imposto pelo modelo de domínio |
| `Der` | Requisito derivado: nasceu de decisão interna de construção, não de stakeholder |

---

## 1. Requisitos funcionais

### Conta e acesso

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-01 | O sistema deve criar uma sessão anônima na primeira abertura, sem exigir cadastro | ✅ | `Der` |
| RF-37 | O sistema deve atribuir um apelido gerado ao usuário anônimo, alterável por ele | ✅ | `Der` |
| RF-38 | O sistema deve permitir vincular a conta anônima a uma identidade Google ou e-mail, preservando o mesmo usuário e todos os seus registros | ✅ | `Der` |
| RF-39 | O sistema deve convidar o usuário a instalar o app na tela inicial | ✅ | `Der` |
| RF-40 | O sistema deve permitir excluir a conta, anonimizando a autoria dos registros de preço e preservando os preços | ✅ | `Der` · RD-11 |

> O convite de RF-39 não é estética: no iOS, um web app aberto pelo navegador tem o
> armazenamento apagado após 7 dias sem interação, e com ele a sessão anônima. Instalado na
> tela inicial, fica isento dessa limpeza. RF-38 cobre o resto — troca ou perda de aparelho.

### Cadastro de preço · UC-01, UC-02, UC-06

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-02 | O sistema deve identificar um produto pela leitura do código de barras | ✅ | `Elic` |
| RF-03 | O sistema deve preencher nome, marca e quantidade a partir de base pública, quando o GTIN for encontrado | ✅ | `Elic` |
| RF-04 | O sistema deve permitir selecionar item sem código de barras a partir de catálogo curado | ✅ | `Elic` |
| RF-05 | O sistema deve impedir que o usuário crie produto que não possua código de barras — esses vêm apenas do catálogo curado | ✅ | `Dom` RD-08 |
| RF-06 | O sistema deve sugerir o mercado mais próximo a partir da localização do usuário | ✅ | `Elic` |
| RF-07 | O sistema deve permitir corrigir o mercado sugerido, escolhendo outro da lista | ✅ | `Der` |
| RF-08 | O sistema deve registrar o preço observado de um produto em um mercado | ✅ | `Elic` |
| RF-09 | O sistema deve permitir anexar foto da etiqueta ao registro | ❌ | `Elic` |
| RF-10 | O sistema deve extrair o valor do preço a partir da foto da etiqueta | ❌ | `Elic` |
| RF-11 | O sistema deve permitir marcar o preço registrado como promocional, distinguindo-o do preço de tabela | ✅ | `Elic` · RD-07 |
| RF-32 | O sistema deve permitir solicitar a inclusão de item ausente do catálogo | ❌ | `Der` |
| RF-33 | O sistema deve permitir preencher os dados de um produto cujo GTIN não for encontrado na base pública | ✅ | `Dom` RD-09 |
| RF-34 | O sistema deve permitir registrar a condição da promoção, como "leve 3 pague 2" | ❌ | `Elic` |
| RF-41 | O sistema deve marcar se a localização do usuário estava a menos de 200 m do mercado no momento do registro, sem impedir o registro quando não estava. Raio provisório, a confirmar em campo | ✅ | `Der` |

### Consulta · UC-03

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-12 | O sistema deve exibir os preços de um produto nos mercados dentro do raio escolhido pelo usuário, tendo a cidade inteira como padrão | ✅ | `Elic` |
| RF-13 | O sistema deve exibir a idade de cada preço apresentado | ✅ | `Dom` |
| RF-14 | O sistema deve exibir o preço por unidade normalizado | ✅ | `Elic` · RD-05, RD-06 |
| RF-15 | O sistema deve exibir o histórico de preços de um produto em um mercado | ✅ | `Elic` |
| RF-16 | O sistema deve excluir da comparação, por padrão, preços com mais de 30 dias | ✅ | `Der` |
| RF-17 | O sistema deve notificar o usuário quando um produto acompanhado baixar de preço | ❌ | `Elic` |
| RF-18 | O sistema deve sinalizar redução de quantidade da embalagem sem redução proporcional de preço | ❌ | `Elic` |
| RF-19 | O sistema deve recomendar produto alternativo mais barato equivalente | ❌ | `Elic` |
| RF-36 | O sistema deve permitir ao usuário ajustar o raio de busca de mercados | ✅ | `Der` |

### Lista de compras · UC-04

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-20 | O sistema deve permitir montar uma lista de compras com produtos e quantidades | ✅ | `Elic` |
| RF-21 | O sistema deve indicar, para cada item da lista, o mercado com o menor preço válido | ✅ | `Elic` |
| RF-22 | O sistema deve comparar o custo total da lista entre os mercados | ❌ | `Elic` |
| RF-23 | O sistema deve sugerir a divisão da lista entre dois ou três mercados | ❌ | `Elic` |

### Confiança no dado · UC-05

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-24 | O sistema deve permitir que um usuário confirme um preço existente sem recadastrá-lo | ✅ | `Elic` |
| RF-25 | O sistema deve distinguir a confirmação feita pelo autor do registro da feita por outro usuário | ✅ | `Dom` RD-03 |
| RF-26 | O sistema deve calcular um indicador de confiabilidade por preço | ❌ | `Elic` |
| RF-27 | O sistema deve manter reputação do usuário a partir do histórico de cadastros | ❌ | `Elic` |
| RF-28 | O sistema deve sinalizar preço muito fora da média histórica | ❌ | `Elic` |
| RF-29 | O sistema deve permitir denunciar preço errado e permitir a um moderador corrigi-lo | ❌ | `Elic` |

### Administração

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-35 | O sistema deve permitir ao mantenedor manter os catálogos de produtos sem código de barras e de mercados | ❌ | `Dom` RD-08, RD-10 |

> No MVP essa manutenção acontece diretamente no banco, sem tela. RF-35 existe para que a
> dependência fique registrada: RF-04 e RF-07 pressupõem catálogos que alguém precisa manter.

### Adoção

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-30 | O sistema deve importar carga inicial de preços de base pública | ❌ | `Elic` |
| RF-31 | O sistema deve atribuir pontos e distintivos a contribuidores | ❌ | `Elic` |

**Resumo:** 41 requisitos funcionais, 25 no MVP.

---

## 2. Requisitos não funcionais

A v4 do SWEBOK separa os não funcionais em **restrições técnicas** — imposições sobre como
a solução é construída — e **restrições de qualidade de serviço** — o quanto o sistema
precisa ser bom em cada atributo.

A coluna **Materialização** registra onde o requisito aterrissa, já que RNF não vira user
story. A coluna **Verificação** existe porque o SWEBOK exige requisito quantificável: sem
método de verificação, o requisito não é verificável e portanto não é um requisito.

### 2.1 Restrições técnicas

| ID | Requisito | Materialização | Verificação |
| -- | --------- | -------------- | ----------- |
| RNF-01 | A aplicação deve ser um PWA instalável, sem publicação em loja | Arquitetura | Instalar na tela inicial em Android e em iOS |
| RNF-02 | A leitura de código de barras deve funcionar em navegadores sem a API nativa | Arquitetura: biblioteca JavaScript alternativa | Ler cinco códigos reais no Safari do iOS |
| RNF-03 | O custo mensal de infraestrutura deve ser R$ 0 enquanto o uso couber nos planos gratuitos | Arquitetura e critério de escolha de serviço | Painel de faturamento do Supabase e do Cloudflare |
| RNF-04 | Os dados devem residir em banco relacional | Arquitetura | Inspeção |

> RNF-03 aplica a noção de *economics of quality of service constraints* da v4: não é que
> disponibilidade maior seja indesejável, é que ela não se paga nesta fase.

### 2.2 Qualidade de serviço

| ID | Requisito | Materialização | Verificação |
| -- | --------- | -------------- | ----------- |
| RNF-05 | **Provisório.** Registrar um preço deve levar no máximo 15 segundos, do abrir o app ao salvar | Critério de aceitação em UC-01 | Cronometrar dez registros em mercado real. O número será revisto após essa medição: o tempo de fixação de GPS em ambiente fechado é a variável desconhecida (risco R11) |
| RNF-06 | Nenhum registro iniciado sem conectividade pode ser perdido | Arquitetura: fila local com reenvio | Registrar em modo avião, restaurar a rede e conferir a gravação |
| RNF-07 | Todos os controles do fluxo de registro devem estar na metade inferior da tela, com alvos de toque de ao menos 44 px | Critério de aceitação em UC-01 | Inspeção de layout em tela de 6 polegadas |
| RNF-08 | O primeiro carregamento útil deve ocorrer em até 3 s sob 3G simulado, com pacote inicial de no máximo 200 KB comprimidos | Critério de aceitação global | Lighthouse com limitação de rede |
| RNF-09 | A consulta de preços de um produto deve responder em até 2 s no percentil 95 | Critério de aceitação em UC-03 | Medição sobre a base de produção |

### 2.3 Conformidade

| ID | Requisito | Materialização | Verificação |
| -- | --------- | -------------- | ----------- |
| RNF-10 | A coleta de geolocalização exige consentimento explícito e revogável | Critério de aceitação em UC-01 e item de *definition of done* | Revogar a permissão e confirmar que o app degrada sem quebrar |
| RNF-11 | Só devem ser coletados os dados pessoais necessários à função | Item de *definition of done* | Revisar o modelo de dados contra a lista de finalidades da §6 |
| RNF-13 | A coordenada do dispositivo não deve ser persistida; só o mercado escolhido e o indicador de conferência | Modelagem | Inspecionar o esquema: nenhuma coluna de latitude ou longitude em `registro_preco` |
| RNF-12 | A identidade de quem cadastrou um preço não deve ser exposta a outros usuários | Modelagem e critério de aceitação em UC-03 | Inspecionar a resposta da API de consulta |

---

## 3. Requisitos derivados

Conceito da v4: requisitos que **não vêm de stakeholder algum**, e sim de decisões internas
de construção. Registrá-los à parte evita a ilusão de que alguém os pediu — e deixa claro
que podem ser revistos se a decisão que os gerou mudar.

| ID | Requisito derivado | Deriva de |
| -- | ------------------ | --------- |
| RF-01 | Conta e autenticação | Dado colaborativo exige autoria; ninguém pediu login |
| RF-07 | Correção do mercado sugerido | Imprecisão do GPS em ambiente fechado |
| RF-16 | Corte de 30 dias na comparação | Decisão de tratar idade na consulta, não no dado |
| RF-32 | Pedido de inclusão de item no catálogo | Consequência de fechar a criação de produto sem GTIN |
| RF-36 | Ajuste do raio de busca | Consequência de "mercados próximos" não ter um número universal |
| RF-01, RF-37 | Sessão anônima e apelido gerado | Decisão de eliminar cadastro inicial; ninguém pediu login |
| RF-38, RF-39 | Vínculo de identidade e convite de instalação | Consequência do PWA: armazenamento do navegador pode ser apagado, e com ele a conta |
| RF-41 | Marca de conferência no local | Uso da geolocalização como sinal de confiança em vez de bloqueio |
| RNF-02 | Alternativa à API nativa de código de barras | Escolha do PWA somada à ausência dessa API no Safari |
| RNF-06 | Fila local de reenvio | Escolha do PWA somada ao sinal ruim dentro do mercado |

---

## 4. Rastreabilidade

Sem matriz separada. Os elos vivem nos próprios artefatos:

```
Brainstorm  →  RF-xx / RNF-xx  →  UC-xx  →  US-xx (backlog)
                    ↑
              RD-xx (modelo de domínio)
```

Cada RF traz a origem; cada caso de uso lista os RF que realiza; cada RNF diz onde
aterrissa. Para o tamanho deste projeto, isso substitui a matriz sem perder o elo.

---

## 5. Pendências

Só o que falta decidir para um requisito ficar completo. Achados de revisão ficam na
[validação](../4-validacao/validacao.md); tarefas de campo, nos marcos da Visão.

| Pendência | Bloqueia |
| --------- | -------- |
Ambas aguardam trabalho de campo e não bloqueiam a construção.

| Pendência | Bloqueia |
| --------- | -------- |
| Cobertura da base pública de produtos para itens vendidos em Goianésia | RF-03 e RF-33, e a utilidade prática de RF-02 |
| Número definitivo do tempo máximo de registro e do raio que conta como "conferido no local" | RNF-05 e RF-41, hoje provisórios em 15 s e 200 m |

---

## 6. Finalidades de uso de dados pessoais

Lista exigida pelo RNF-11 e pelo princípio de minimização da LGPD. Cada dado pessoal
coletado, para que serve e por quanto tempo fica.

| Dado | Finalidade | Retenção |
| ---- | ---------- | -------- |
| Coordenada do dispositivo | Sugerir o mercado e verificar se coincide com ele no momento do registro | **Não é armazenada.** Usada na hora e descartada; persiste apenas o mercado escolhido e o indicador de conferência (RNF-13) |
| Identificador do usuário | Atribuir autoria, aplicar o limite diário por produto e mercado, distinguir auto-confirmação de confirmação de terceiro | Até a exclusão da conta, quando a autoria é anonimizada e o preço permanece (RD-11) |
| Apelido | Identificar a pessoa na interface para ela mesma | Idem |
| E-mail ou identidade Google | Recuperar a conta em outro aparelho. Só existe se a pessoa optar por vincular | Até a exclusão da conta |
| Lista de compras | Montar a comparação por item | Até a pessoa apagar, por exclusão lógica, ou excluir a conta, quando é removida de fato (RD-12) |

**Não coletados:** nome civil, telefone, endereço, documento, foto e histórico de
deslocamento. Nenhum é necessário a qualquer função especificada.

A geolocalização depende de consentimento explícito e revogável (RNF-10); recusar reduz o
app a escolher o mercado na lista, sem impedir nada.
