# Visão do Projeto — Bom Preço

**Versão 0.1**

## Histórico de Revisão

| Data | Versão | Descrição | Autor |
| ---- | ------ | --------- | ----- |
| 21/08/2026 | 1.0| Versão inicial, derivada do brainstorm de elicitação | Valderson Junior |

---

## 1. Introdução

### 1.1 Declaração do Problema

| | |
| --- | --- |
| **O problema de** | não saber qual mercado determinado produto tem chance de estar mais barato |
| **Afeta** | consumidores que fazem compra de supermercado com orçamento controlado |
| **Cujo impacto é** | pagar mais caro pelo mesmo produto; não perceber aumentos graduais nem redução de embalagem (*shrinkflation*); perder tempo comparando preços manualmente, sem base confiável para decidir |
| **Uma solução de sucesso seria** | mostrar, para dado produto ou lista de produtos, onde cada um está mais barato - com preços recentes, confiáveis e também comparáveis entre embalagens de tamanhos diferentes do mesmo produto |

### 1.2 Objetivos do Projeto

**Objetivo principal.** Permitir que uma pessoa saiba, antes de comprar, onde cada item
da sua lista está mais barato, usando preços cadastrados pelos próprios usuários.

**Objetivos secundários.**

- Manter histórico de preços por produto e mercado, revelando variação ao longo do tempo
  e distinguindo promoção real de preço inflado antes do desconto.
- Tornar o preço colaborativo confiável o bastante para embasar a decisão de compra, sem
  depender de nenhuma fonte oficial.
- Comparar embalagens de tamanhos diferentes em base justa (preço por unidade).

**Não-objetivos.** Não é agregador de encartes ou cupons; não se integra aos sistemas de
preço dos mercados; não vende nem intermedeia compra.

---

## 2. Stakeholders

| Nome | Descrição | Responsabilidades |
| ---- | --------- | ----------------- |
| Autor / mantenedor | Desenvolvedor do produto e também usuário-alvo. Projeto individual: acumula os papéis de análise, desenvolvimento, testes e moderação | Define escopo e prioridades; desenvolve e mantém o sistema; garante que o esforço de manutenção continue viável para uma pessoa só |
| Contribuidor | Usuário que cadastra preços enquanto está no mercado | Alimenta a base com preços corretos; confirma preços cadastrados por outros. É de quem depende a existência do dado |
| Consultor | Usuário que consulta preços antes de comprar, sem necessariamente contribuir | Usa o produto para decidir a compra; reporta preço errado que encontrar na loja |
| Moderador | Papel de quem trata denúncias e preços marcados como suspeitos | Corrige ou remove dado errado; mantém a confiabilidade da base |
| Mercados | Estabelecimentos cujos preços são cadastrados | Não são clientes e têm interesse conflitante: comparação de preços pressiona margem. Alguns proíbem fotografar etiquetas na loja |

> Contribuidor e consultor são papéis, não pessoas distintas — a mesma pessoa alterna
> entre os dois ao longo do uso.

---

## 3. Visão Geral do Produto

### 3.1 Declaração de Posição do Produto

| | |
| --- | --- |
| **Para** | consumidores que fazem compra de supermercado e querem gastar menos |
| **Que** | precisam comparar preços entre mercados da sua região, mas não têm fonte atualizada nem confiável |
| **O Bom Preço** | é um aplicativo colaborativo de comparação de preços de supermercado |
| **Que** | mostra em qual mercado cada item da lista — ou a cesta inteira — sai mais barato, a partir de preços cadastrados e validados pelos próprios usuários |
| **Ao contrário de** | encartes, aplicativos dos próprios mercados e comparadores restritos a e-commerce |
| **Nosso produto** | cruza preços de mercados concorrentes na loja física, com histórico por produto e indicador de confiabilidade por preço cadastrado |

### 3.2 Escopo do Produto

**Cadastro de preço**

- Escaneamento de código de barras
- Preenchimento automático de nome, marca e imagem via base pública de produtos
- Cadastro manual para itens sem código de barras (hortifruti, açougue)
- Foto da etiqueta como evidência do cadastro
- Leitura do preço direto da foto da etiqueta (OCR)
- Identificação automática do mercado por geolocalização

**Preço e histórico**

- Histórico de preço por produto e por mercado
- Preço por unidade (R$/kg, R$/litro)
- Distinção entre preço de tabela e preço promocional
- Detecção de *shrinkflation*
- Expiração de preço não confirmado após X dias
- Alerta quando um produto acompanhado baixa de preço
- Recomendação de produto alternativo mais barato
- Preço em tempo real via integração com o mercado

**Confiabilidade**

- Percentual de confiabilidade por preço cadastrado
- Reputação do usuário baseada no histórico de cadastros
- Confirmação de preço por outro usuário, sem recadastro
- Cruzamento de cadastros independentes para elevar a confiança
- Sinalização de preço fora da média histórica
- Denúncia de preço errado e moderação

**Comparação e decisão**

- Lista de compras com o mercado mais barato por item
- Comparação do total da cesta entre mercados
- Sugestão de dividir a compra entre 2–3 mercados
- Distância e tempo até o mercado como fator de decisão
- Diferenciação de preço por filial

**Adoção**

- Carga inicial a partir de base pública de preços
- Gamificação: pontos e badges para contribuidores confiáveis

### 3.3 Mínimo Produto Viável (MVP)

Recorte mínimo para o produto ser lançável ao grupo restrito e já responder à pergunta
"onde compro mais barato?".

- Cadastro de preço por escaneamento de código de barras, com preenchimento automático
  do produto via base pública
- Cadastro manual para itens sem código de barras
- Identificação do mercado por geolocalização
- Consulta do preço de um produto nos mercados próximos
- Lista de compras indicando o mercado mais barato por item
- Preço por unidade
- Histórico de preço por produto e mercado, com data do último cadastro visível

**Fora do MVP e por quê**

| Deixado de fora | Motivo |
| --------------- | ------ |
| Reputação, percentual de confiabilidade, moderação, denúncia | O lançamento é para um grupo pequeno e conhecido — não há incentivo a fraude ainda. Exibir a data do cadastro já cobre o essencial |
| Gamificação | Depende de reputação; e o grupo inicial já tem motivação própria |
| OCR da etiqueta, foto como evidência | Conveniência, não viabilidade |
| *Shrinkflation*, promoções, alertas, recomendação de alternativo | Dependem de histórico acumulado, que ainda não existe no lançamento |
| Dividir a compra, cesta inteira | Exigem cobertura de preços que a base nova não terá |
| Preço em tempo real | Exigiria integração com os mercados — inviável |

---

## 4. Ferramentas, Ambiente e Infraestrutura

### 4.1 Hardware

| Perfil | Tipo | Configuração | Observação |
| ------ | ---- | ------------ | ---------- |
| Usuário | Smartphone | Câmera traseira e GPS | Requisito de uso: o cadastro acontece de pé, dentro do mercado |
| Desenvolvedor | Máquina de desenvolvimento | - | Já disponível |

### 4.2 Software

| Tipo | Ferramenta | Situação |
| ---- | ---------- | -------- |
| Controle de versão | Git | Definido |
| Aplicativo móvel | — | **A definir** |
| Backend / API | — | **A definir** |
| Banco de dados | — | **A definir** |
| Base pública de produtos | Cosmos ou Open Food Facts | **A avaliar** — verificar custo, limites de uso e cobertura de produtos brasileiros |
| Hospedagem | — | **A definir** |

---

## 5. Gerenciamento de Riscos

| # | Risco | Impacto | Prob. | Mitigação |
| - | ----- | :-----: | :---: | --------- |
| R1 | *Cold start*: base nasce vazia e o app não tem utilidade nas primeiras semanas | Alto | Alta | Restringir a poucos mercados que o grupo já frequenta; avaliar carga inicial a partir de base pública de preços |
| R2 | Contribuição decai e só o autor cadastra preços | Alto | Alta | Cadastro em poucos segundos como requisito de projeto; gamificação em versão futura |
| R3 | Mesmo produto cadastrado com nomes diferentes fragmenta a comparação | Alto | Alta | Priorizar código de barras como identidade; catálogo curado para itens sem código |
| R4 | Preço desatualizado leva a uma decisão de compra errada e queima a confiança no app | Alto | Média | Exibir a data de cadastro sempre; expiração e confirmação de preço em versão futura |
| R5 | Base pública de produtos com cobertura baixa no Brasil ou com custo | Médio | Média | Cadastro manual como caminho alternativo sempre disponível; armazenar localmente o que já foi consultado |
| R6 | Dados pessoais: geolocalização e histórico de compra estão sob a LGPD | Alto | Média | Consentimento explícito; coletar o mínimo; não expor a identidade do contribuidor |
| R7 | Mercados proíbem fotografar etiquetas nas lojas | Baixo | Média | Foto é opcional — o cadastro funciona sem evidência |
| R8 | Projeto individual com tempo limitado diante de um escopo grande | Alto | Alta | MVP enxuto e lançamento para grupo pequeno |

---

## 6. Canvas MVP

| Bloco | Conteúdo |
| ----- | -------- |
| **Proposta do MVP** | Um app onde um grupo pequeno cadastra os preços que vê no mercado e consulta, pela lista de compras, onde cada item está mais barato |
| **Segmento de clientes** | Autor e seu grupo de família/amigos que fazem compra de supermercado na mesma região |
| **Jornadas** | (1) No mercado: escanear o produto, confirmar o preço, salvar. (2) Antes da compra: montar a lista e ver o mercado mais barato de cada item |
| **Funcionalidades** | Escaneamento com preenchimento automático; cadastro manual; mercado por geolocalização; consulta de preço; lista de compras comparada; preço por unidade; histórico com data |
| **Custo e cronograma** | **A definir** |
| **Métricas para validar hipóteses** | Nº de preços cadastrados por semana; nº de contribuidores ativos; cobertura (produtos com preço válido por mercado); consultas antes da compra; economia estimada por compra |
| **Resultado esperado** | O grupo passa a consultar o app antes de comprar, e a base se mantém atualizada sem depender só do autor |
