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
| [3-especificacao/requisitos.md](3-especificacao/requisitos.md) | 35 requisitos funcionais e 12 não funcionais, com origem e verificação |
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

Duas rodadas de validação, **19 achados, 13 resolvidos** — Visão na versão 1.3. Nenhum dos
abertos bloqueia o início da construção.

A ideia que mais moldou o modelo foi fechar a criação de dados pelo usuário: itens sem
código de barras e mercados vêm de **catálogos mantidos pelo autor**, não de cadastro livre.
Isso derrubou o risco R3 de probabilidade alta para baixa, e é o que torna a comparação
confiável com pouquíssimos usuários.

**Aberto e relevante:**

- **S-05** — o requisito de registrar um preço em 15 s não fecha se contar o tempo de
  fixação de GPS dentro do mercado. Depende de medição em campo, e virou o risco R11
- **S-06** — a mitigação do maior risco do projeto (base vazia no lançamento) é a carga
  inicial de base pública, que está fora do MVP
- **Cobertura da base pública de produtos** em Goianésia — afeta RF-03 e RF-33
- ***Shrinkflation*** é objetivo real ou ideia solta? Afeta RF-18, e é o único item cujo
  adiamento custa caro: sem historizar a quantidade do produto, a evidência se perde

**Antes de qualquer código:** montar os catálogos de Goianésia — mercados e itens sem código
de barras. É levantamento em campo, não programação, e é o marco 1 do cronograma.
