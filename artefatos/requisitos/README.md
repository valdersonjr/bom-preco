# Engenharia de Requisitos — Bom Preço

Índice dos artefatos e mapa de cobertura dos tópicos da área de conhecimento **Software
Requirements** do SWEBOK.

## Artefatos

| Artefato | Conteúdo |
| -------- | -------- |
| [1-elicitacao/brainstorm.md](1-elicitacao/brainstorm.md) | Registro bruto das ideias, sem filtro de viabilidade |
| [1-elicitacao/visao.md](1-elicitacao/visao.md) | Problema, objetivos, stakeholders, posicionamento, escopo, MVP, infraestrutura e riscos |
| [2-analise/modelo-de-dominio.md](2-analise/modelo-de-dominio.md) | Glossário, entidades, decisões de modelagem e regras de domínio |
| [2-analise/casos-de-uso.md](2-analise/casos-de-uso.md) | Comportamento do MVP em cinco casos de uso breves |
| [3-especificacao/requisitos.md](3-especificacao/requisitos.md) | 36 requisitos funcionais e 12 não funcionais, com origem e verificação |
| [4-validacao/validacao.md](4-validacao/validacao.md) | Duas rodadas de revisão por completude, consistência, verificabilidade e viabilidade |

**Ordem de leitura sugerida:** Visão → modelo de domínio → requisitos → validação. O
brainstorm interessa só para saber de onde veio cada ideia.

## Cobertura dos tópicos do SWEBOK

| Tópico | Onde é atendido |
| ------ | --------------- |
| **Fundamentos de requisitos** | Distinção entre funcionais, não funcionais e derivados na especificação; vocabulário fixado no glossário |
| **Processo de requisitos** | As pastas numeradas refletem o processo — elicitação, análise, especificação, validação — percorrido de forma iterativa, não sequencial |
| **Elicitação** — fontes | Visão: objetivos §1.2, stakeholders §2, ambiente operacional e organizacional §4 e §6. Conhecimento de domínio e regras de negócio no modelo de domínio |
| **Elicitação** — técnicas | Brainstorming. Entrevista, observação e protótipo não se aplicam nesta fase: o autor é o próprio usuário-alvo |
| **Análise** — classificação | Tabelas de RF e RNF, com a subdivisão da v4 entre restrições técnicas e qualidade de serviço |
| **Análise** — modelagem conceitual | Modelo de domínio e casos de uso |
| **Análise** — alocação arquitetural | Visão §4 |
| **Análise** — negociação | Visão §3.3: recorte do MVP e tabela do que ficou fora, com motivo |
| **Especificação** | `requisitos.md` no papel de SRS; Visão no papel de System Definition Document. Especificação por critérios de aceitação, conforme a v4, nos RNF |
| **Validação** | `validacao.md`, em duas rodadas. Sem revisão formal com ata, por não haver equipe para revisar |
| **Considerações práticas** — atributos | Origem e prioridade em todo RF; método de verificação em todo RNF |
| **Considerações práticas** — rastreabilidade | Elos embutidos nos artefatos, sem matriz separada. Cadeia em `requisitos.md` §4 |
| **Considerações práticas** — gestão | Identificador estável por requisito; mudança registrada por commit; histórico de revisão na Visão |
| **Ferramentas** | Git e os próprios documentos. Ferramenta dedicada descartada por escala |

Nenhum tópico ficou sem tratamento. Os artefatos que o SWEBOK admite e este projeto não
produz — SRS completo, matriz de rastreabilidade separada, revisão formal com ata — foram
dispensados por escala: uma pessoa, sem cliente externo e sem prazo.

## Estado

Duas rodadas de validação, **20 achados, 19 resolvidos** — Visão na versão 1.4. Nada
bloqueia o início da construção.

Duas decisões moldaram o resultado:

- **Fechar a criação de dados pelo usuário.** Itens sem código de barras e mercados vêm de
  catálogos mantidos pelo autor, não de cadastro livre. É o que torna a comparação confiável
  com pouquíssimos usuários, e derrubou o risco R3 de probabilidade alta para baixa
- **Assumir o uso individual primeiro.** O autor é o usuário número um e enche a base com a
  própria compra semanal. Base vazia no lançamento deixou de ser risco, e o convite a outras
  pessoas virou questão de sequenciamento

**Pendências de especificação**, nenhuma bloqueante: cobertura da base pública de produtos
em Goianésia, o número definitivo do tempo máximo de registro — hoje provisório em 15 s, a
medir em campo — e a lista de finalidades de dados pessoais, que falta para o RNF-11 ter
verificação objetiva.

**Antes de qualquer código:** montar os catálogos de Goianésia — mercados e itens sem código
de barras. É levantamento em campo, não programação, e é o marco 1 do cronograma.
