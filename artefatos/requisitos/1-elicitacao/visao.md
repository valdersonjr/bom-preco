# Visão do Projeto — Bom Preço

**Versão 1.1**

## Histórico de Revisão

| Data | Versão | Descrição | Autor |
| ---- | ------ | --------- | ----- |
| 21/08/2026 | 1.0 | Versão inicial, derivada do brainstorm de elicitação | Valderson Junior |
| 21/08/2026 | 1.1 | Público-alvo e abrangência, decisões de tecnologia, MVP revisado, custo e marcos | Valderson Junior |

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
| Primeiros usuários | Pessoas próximas ao autor, em Goianésia, que aceitarem usar o app antes de ele ter base formada | Sustentam a base nos primeiros meses, quando ainda há pouco dado; dizem se o produto resolve um problema real de rotina |
| Contribuidor | Usuário que cadastra preços enquanto está no mercado | Alimenta a base com preços corretos; confirma preços cadastrados por outros. É de quem depende a existência do dado |
| Consultor | Usuário que consulta preços antes de comprar, sem necessariamente contribuir | Usa o produto para decidir a compra; reporta preço errado que encontrar na loja |
| Moderador | Papel de quem trata denúncias e preços marcados como suspeitos | Corrige ou remove dado errado; mantém a confiabilidade da base |
| Mercados | Estabelecimentos cujos preços são cadastrados | Não são clientes e têm interesse conflitante: comparação de preços pressiona margem. Alguns proíbem fotografar etiquetas na loja |

> Contribuidor e consultor são papéis, não pessoas distintas — a mesma pessoa alterna
> entre os dois ao longo do uso. O acesso é aberto a quem pedir: não existe grupo fechado,
> mas prevê-se um período inicial com poucos usuários, crescendo por indicação à medida
> que o app se mostrar útil.

---

## 3. Visão Geral do Produto

### 3.1 Declaração de Posição do Produto

| | |
| --- | --- |
| **Para** | consumidores que fazem compra de supermercado e querem gastar menos — no lançamento, moradores de Goianésia–GO |
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

Recorte mínimo para o produto ser lançável e já responder à pergunta
"onde compro mais barato?".

**Lançamento.** Goianésia–GO, com acesso aberto a quem pedir. A abertura para outras
localidades vem depois, quando a operação em uma cidade estiver validada.

- Cadastro de preço por escaneamento de código de barras, com preenchimento automático
  do produto via base pública
- Cadastro manual para itens sem código de barras
- Identificação do mercado por geolocalização
- Cadastro salvo localmente e reenviado sozinho quando a conexão volta
- Confirmação de preço por outro usuário, em um toque
- Consulta do preço de um produto nos mercados próximos
- Lista de compras indicando o mercado mais barato por item
- Preço por unidade
- Histórico de preço por produto e mercado, com data do último cadastro visível

**Fora do MVP e por quê**

| Deixado de fora | Motivo |
| --------------- | ------ |
| Reputação, percentual de confiabilidade, moderação, denúncia | O acesso é aberto, mas o volume inicial é baixo e os primeiros usuários são pessoas próximas. A confirmação em um toque, somada à data do cadastro, já dá sinal suficiente; reputação e moderação entram quando a base crescer |
| Gamificação | Depende de reputação; e os primeiros usuários já têm motivação própria |
| OCR da etiqueta, foto como evidência | Conveniência, não viabilidade. Foto é também o único item que consome armazenamento de verdade |
| *Shrinkflation*, promoções, alertas, recomendação de alternativo | Dependem de histórico acumulado, que ainda não existe no lançamento |
| Dividir a compra, cesta inteira | Exigem cobertura de preços que a base nova não terá |
| Consulta de preços offline | Só o cadastro é protegido contra falta de sinal; consultar exige conexão |
| Preço em tempo real | Exigiria integração com os mercados — inviável |

---

## 4. Ferramentas, Ambiente e Infraestrutura

### 4.1 Hardware

| Perfil | Tipo | Configuração | Observação |
| ------ | ---- | ------------ | ---------- |
| Usuário | Smartphone | Câmera traseira, GPS e navegador atualizado | O cadastro acontece de pé, dentro do mercado, com o carrinho na mão |
| Desenvolvedor | Máquina de desenvolvimento | - | Já disponível |
| Teste | Aparelho Android e aparelho iOS | - | Necessários para validar o PWA nos dois navegadores. O Safari é o caso crítico |

### 4.2 Software

| Tipo | Ferramenta | Situação |
| ---- | ---------- | -------- |
| Controle de versão | Git e GitHub | Definido |
| Aplicativo | PWA em React com Vite | Definido |
| Backend | Supabase — autenticação, API e storage | Definido |
| Banco de dados | PostgreSQL gerenciado pelo Supabase | Definido |
| Hospedagem do PWA | Cloudflare Pages | Definido |
| Leitura de código de barras | BarcodeDetector API, com fallback em biblioteca JavaScript nos navegadores sem suporte | Definido |
| Base pública de produtos | Open Food Facts, com Cosmos como alternativa paga | **A validar** — testar a cobertura com uma amostra real de produtos de Goianésia antes de decidir |

**Por que PWA.** Publicar em loja custa US$ 25 uma vez na Google Play e US$ 99 por ano na
Apple, além do processo de revisão a cada versão. O PWA elimina os dois e permite
atualizar sem esperar aprovação.

**Por que Supabase.** As consultas que dão razão ao produto — comparar cesta entre
mercados, histórico por produto, busca por proximidade — são relacionais. Um banco NoSQL
cobraria por documento lido e deixaria essas consultas desconfortáveis. O preço dessa
escolha é não vir com persistência offline pronta, o que aqui é coberto pela fila de
reenvio do cadastro.

---

## 5. Gerenciamento de Riscos

| # | Risco | Impacto | Prob. | Mitigação |
| - | ----- | :-----: | :---: | --------- |
| R1 | *Cold start*: base nasce vazia e o app não tem utilidade nas primeiras semanas | Alto | Alta | Concentrar em Goianésia, cidade com cerca de dez supermercados relevantes, onde a cobertura por mercado sobe rápido; avaliar carga inicial a partir de base pública de preços |
| R2 | Contribuição decai e só o autor cadastra preços | Alto | Alta | Cadastro em poucos segundos como requisito de projeto; gamificação em versão futura |
| R3 | Mesmo produto cadastrado com nomes diferentes fragmenta a comparação | Alto | Alta | Priorizar código de barras como identidade; catálogo curado para itens sem código |
| R4 | Preço desatualizado leva a uma decisão de compra errada e queima a confiança no app | Alto | Média | Data do cadastro sempre visível e confirmação em um toque já no MVP; expiração automática em versão futura |
| R5 | Base pública de produtos com cobertura baixa no Brasil ou com custo | Médio | Média | Cadastro manual como caminho alternativo sempre disponível; armazenar localmente o que já foi consultado |
| R6 | Dados pessoais: geolocalização e histórico de compra estão sob a LGPD | Alto | Média | Consentimento explícito; coletar o mínimo; não expor a identidade do contribuidor |
| R7 | Mercados proíbem fotografar etiquetas nas lojas | Baixo | Média | Foto é opcional — o cadastro funciona sem evidência |
| R8 | Escopo grande para um projeto individual | Alto | Baixa | Mais de 20 horas semanais disponíveis e sem prazo externo; MVP enxuto mantém o escopo sob controle |
| R9 | PWA no iOS: o Safari não expõe a API nativa de leitura de código de barras, e instalação e notificações são limitadas | Médio | Alta | Fallback de leitura em JavaScript; priorizar Android, majoritário no público inicial; testar em aparelho iOS real antes do lançamento |
| R10 | Acesso aberto sem reputação permite inserir preços errados em massa | Médio | Baixa | Volume inicial baixo e usuários majoritariamente conhecidos; confirmação por outro usuário dá sinal; reputação e moderação entram se o problema aparecer |

---

## 6. Canvas MVP

| Bloco | Conteúdo |
| ----- | -------- |
| **Proposta do MVP** | Um app onde as pessoas cadastram os preços que veem no mercado e consultam, pela lista de compras, onde cada item está mais barato |
| **Segmento de clientes** | Moradores de Goianésia–GO que fazem compra de supermercado. Começa com pessoas próximas ao autor, com acesso aberto a quem pedir |
| **Jornadas** | (1) No mercado: escanear o produto, confirmar o preço e salvar, mesmo com sinal ruim. (2) Antes da compra: montar a lista e ver o mercado mais barato de cada item |
| **Funcionalidades** | Escaneamento com preenchimento automático; cadastro manual; mercado por geolocalização; fila de reenvio offline; confirmação de preço; consulta de preço; lista de compras comparada; preço por unidade; histórico com data |
| **Custo** | R$ 40 por ano, referentes ao domínio `.com.br`. Infraestrutura sem custo na fase inicial (Supabase Free e Cloudflare Pages) e sem taxa de loja de aplicativos por ser PWA |
| **Cronograma** | Sem prazo externo. Marcos estimados abaixo |
| **Métricas para validar hipóteses** | Preços cadastrados por semana; contribuidores ativos; cobertura, medida em produtos com preço válido por mercado; consultas feitas antes da compra; economia estimada por lista |
| **Resultado esperado** | Os primeiros usuários passam a consultar o app antes de comprar, e a base se mantém atualizada sem depender só do autor |

**Marcos estimados** — considerando cerca de 20 horas semanais e sem data fixa:

1. **Fundação** (1–2 semanas) — esquema no Postgres para produtos, mercados e preços;
   autenticação; projeto React/Vite publicado como PWA
2. **Cadastro** (3–4 semanas) — scanner de código de barras, integração com a base pública
   de produtos, cadastro manual, geolocalização do mercado, fila de reenvio
3. **Consulta** (2–3 semanas) — busca de produto, histórico, preço por unidade, lista de
   compras com o mercado mais barato por item, confirmação de preço
4. **Campo** (contínuo) — uso real em Goianésia com os primeiros usuários, ajustando o que
   o uso mostrar

A soma dá algo entre dois e três meses até o primeiro uso real. É estimativa, não
compromisso.
