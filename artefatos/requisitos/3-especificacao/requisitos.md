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
| `Visão` | Decorre de decisão de escopo registrada na Visão |

---

## 1. Requisitos funcionais

### Conta e acesso

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-01 | O sistema deve permitir que uma pessoa crie conta e autentique-se | ✅ | `Der` |

### Cadastro de preço · UC-01, UC-02, UC-06

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-02 | O sistema deve identificar um produto pela leitura do código de barras | ✅ | `Elic` |
| RF-03 | O sistema deve preencher nome, marca e quantidade a partir de base pública, quando o GTIN for encontrado | ✅ | `Elic` |
| RF-04 | O sistema deve permitir selecionar item sem código de barras a partir de catálogo curado | ✅ | `Elic` |
| RF-05 | O sistema deve impedir que o usuário crie produto sem código de barras | ✅ | `Dom` RD-08 |
| RF-06 | O sistema deve identificar o mercado a partir da localização do usuário | ✅ | `Elic` |
| RF-07 | O sistema deve permitir corrigir o mercado sugerido, escolhendo outro da lista | ✅ | `Der` |
| RF-08 | O sistema deve registrar o preço observado de um produto em um mercado | ✅ | `Elic` |
| RF-09 | O sistema deve permitir anexar foto da etiqueta ao registro | ❌ | `Elic` |
| RF-10 | O sistema deve extrair o valor do preço a partir da foto da etiqueta | ❌ | `Elic` |
| RF-11 | O sistema deve permitir marcar o preço registrado como promocional, distinguindo-o do preço de tabela | ✅ | `Elic` · RD-07 |
| RF-32 | O sistema deve permitir solicitar a inclusão de item ausente do catálogo | ❌ | `Der` |
| RF-33 | O sistema deve permitir preencher os dados de um produto cujo GTIN não for encontrado na base pública | ✅ | `Dom` RD-09 |
| RF-34 | O sistema deve permitir registrar a condição da promoção, como "leve 3 pague 2" | ❌ | `Elic` |

### Consulta · UC-03

| ID | Requisito | MVP | Origem |
| -- | --------- | :-: | ------ |
| RF-12 | O sistema deve exibir os preços de um produto nos mercados próximos ao usuário | ✅ | `Elic` |
| RF-13 | O sistema deve exibir a idade de cada preço apresentado | ✅ | `Dom` |
| RF-14 | O sistema deve exibir o preço por unidade normalizado | ✅ | `Elic` · RD-05, RD-06 |
| RF-15 | O sistema deve exibir o histórico de preços de um produto em um mercado | ✅ | `Elic` |
| RF-16 | O sistema deve excluir da comparação, por padrão, preços com mais de 30 dias | ✅ | `Der` |
| RF-17 | O sistema deve notificar o usuário quando um produto acompanhado baixar de preço | ❌ | `Elic` |
| RF-18 | O sistema deve sinalizar redução de quantidade da embalagem sem redução proporcional de preço | ❌ | `Elic` |
| RF-19 | O sistema deve recomendar produto alternativo mais barato equivalente | ❌ | `Elic` |

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

**Resumo:** 35 requisitos funcionais, 19 no MVP.

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
| RNF-05 | Registrar um preço deve levar no máximo 15 segundos, do abrir o app ao salvar | Critério de aceitação em UC-01 | Cronometrar dez registros em mercado real |
| RNF-06 | Nenhum registro iniciado sem conectividade pode ser perdido | Arquitetura: fila local com reenvio | Registrar em modo avião, restaurar a rede e conferir a gravação |
| RNF-07 | Todos os controles do fluxo de registro devem estar na metade inferior da tela, com alvos de toque de ao menos 44 px | Critério de aceitação em UC-01 | Inspeção de layout em tela de 6 polegadas |
| RNF-08 | O primeiro carregamento útil deve ocorrer em até 3 s sob 3G simulado, com pacote inicial de no máximo 200 KB comprimidos | Critério de aceitação global | Lighthouse com limitação de rede |
| RNF-09 | A consulta de preços de um produto deve responder em até 2 s no percentil 95 | Critério de aceitação em UC-03 | Medição sobre a base de produção |

### 2.3 Conformidade

| ID | Requisito | Materialização | Verificação |
| -- | --------- | -------------- | ----------- |
| RNF-10 | A coleta de geolocalização exige consentimento explícito e revogável | Critério de aceitação em UC-01 e item de *definition of done* | Revogar a permissão e confirmar que o app degrada sem quebrar |
| RNF-11 | Só devem ser coletados os dados pessoais necessários à função | Item de *definition of done* | Revisar o modelo de dados contra a lista de finalidades |
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

| Pendência | Bloqueia |
| --------- | -------- |
| Cobertura da base pública de produtos para itens vendidos em Goianésia | RF-03 e RF-33, e a utilidade prática de RF-02 |
| *Shrinkflation* é objetivo real ou ideia solta do brainstorm? | RF-18. Se for real, o histórico de quantidade precisa existir desde o início — é o único item com custo alto de adiar |
| Montagem dos catálogos de Goianésia: itens sem código de barras e mercados | RF-04, RF-07 e RF-35. Não é código: é levantamento em campo, e precede o lançamento |
| RNF-05 dá 15 s para registrar um preço, mas o orçamento estoura só com carregamento, fixação de GPS e chamada à base pública | Achado S-05, em aberto. Ou o número sobe, ou o escopo do requisito encolhe para não contar o tempo de GPS |
