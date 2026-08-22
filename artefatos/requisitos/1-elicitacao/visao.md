# Visão do Projeto — Bom Preço

**Versão 1.7**

## Histórico de Revisão

| Data | Versão | Descrição | Autor |
| ---- | ------ | --------- | ----- |
| 21/08/2026 | 1.0 | Versão inicial, derivada do brainstorm de elicitação | Valderson Junior |
| 21/08/2026 | 1.1 | Público-alvo e abrangência, decisões de tecnologia, MVP revisado, custo e marcos | Valderson Junior |
| 22/08/2026 | 1.2 | Correções de coerência apontadas na validação: posicionamento, escopo, MVP e catálogo de itens sem código de barras | Valderson Junior |
| 22/08/2026 | 1.3 | Revisão de engenharia: marcação de promoção no MVP, auto-confirmação, catálogo de mercados e risco de GPS em ambiente fechado | Valderson Junior |
| 22/08/2026 | 1.4 | Cold start reformulado para uso individual primeiro; posicionamento e métricas corrigidos; raio de busca configurável | Valderson Junior |
| 22/08/2026 | 1.5 | Entrada sem cadastro por conta anônima; geolocalização como sinal de confiança e não como bloqueio; finalidades de dados pessoais declaradas | Valderson Junior |
| 22/08/2026 | 1.6 | Varredura de coerência: riscos R2, R4, R6 e R9 alinhados às decisões vigentes; stakeholders, escopo e hardware atualizados | Valderson Junior |
| 22/08/2026 | 1.7 | Base de produtos importada do dump do Open Food Facts, com a API como reserva; atribuição ODbL exigida | Valderson Junior |

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
| Primeiros convidados | Pessoas próximas ao autor, em Goianésia, convidadas depois que a base já tiver dado suficiente para ser útil | Ampliam a cobertura para além dos mercados que o autor frequenta; dizem se o produto resolve um problema real de rotina |
| Contribuidor | Usuário que cadastra preços enquanto está no mercado | Alimenta a base com preços corretos; confirma preços cadastrados por outros. É de quem depende a existência do dado |
| Consultor | Usuário que consulta preços antes de comprar, sem necessariamente contribuir | Usa o produto para decidir a compra; corrige preço errado registrando o valor correto que viu na prateleira |
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
| **Que** | mostra em qual mercado cada item da sua lista sai mais barato, a partir de preços cadastrados e validados pelos próprios usuários |
| **Ao contrário de** | encartes, aplicativos dos próprios mercados e comparadores restritos a e-commerce |
| **Nosso produto** | cruza preços de mercados concorrentes na loja física, com histórico por produto e a data em que cada preço foi visto |

### 3.2 Escopo do Produto

**Cadastro de preço**

- Escaneamento de código de barras
- Preenchimento automático de nome, marca e quantidade via base pública de produtos
- Imagem do produto vinda da base pública
- Catálogo curado de itens sem código de barras (hortifruti, açougue), mantido pelo autor
- Solicitação de inclusão de item ausente do catálogo
- Foto da etiqueta como evidência do cadastro
- Leitura do preço direto da foto da etiqueta (OCR)
- Identificação automática do mercado por geolocalização, a partir de catálogo de mercados
  mantido pelo autor

**Preço e histórico**

- Histórico de preço por produto e por mercado
- Preço por unidade (R$/kg, R$/litro)
- Distinção entre preço de tabela e preço promocional
- Detecção de *shrinkflation*
- Alerta quando um produto acompanhado baixa de preço
- Recomendação de produto alternativo mais barato
- Preço em tempo real via integração com o mercado

**Confiabilidade**

- Marca de conferência da localização no momento do registro
- Percentual de confiabilidade por preço cadastrado
- Reputação do usuário baseada no histórico de cadastros
- Confirmação de preço sem recadastro, distinguindo a do autor da de terceiro
- Cruzamento de cadastros independentes para elevar a confiança
- Sinalização de preço fora da média histórica
- Denúncia de preço errado e moderação

**Comparação e decisão**

- Lista de compras com o mercado mais barato por item
- Comparação do total da cesta entre mercados
- Sugestão de dividir a compra entre 2–3 mercados

**Adoção**

- Carga inicial a partir de base pública de preços
- Gamificação: pontos e badges para contribuidores confiáveis

### 3.3 Mínimo Produto Viável (MVP)

Recorte mínimo para o produto ser lançável e já responder à pergunta
"onde compro mais barato?".

**Lançamento.** Goianésia–GO, com acesso aberto a quem pedir. A abertura para outras
localidades vem depois, quando a operação em uma cidade estiver validada.

- Uso imediato com conta anônima, sem cadastro, com apelido gerado
- Vínculo opcional a Google ou e-mail depois, preservando conta e registros
- Cadastro de preço por escaneamento de código de barras, com preenchimento automático
  do produto via base pública
- Seleção de item sem código de barras a partir de catálogo curado
- Sugestão do mercado por geolocalização, escolhido de lista mantida pelo autor
- Marca de "conferido no local" quando a localização coincide com o mercado
- Marcação do preço como normal ou promocional
- Cadastro salvo localmente e reenviado sozinho quando a conexão volta
- Confirmação de preço em um toque, distinguindo a de terceiro da do próprio autor
- Consulta do preço de um produto nos mercados dentro do raio escolhido
- Lista de compras indicando o mercado mais barato por item
- Preço por unidade
- Histórico de preço por produto e mercado, com data do último cadastro visível
- Preços com mais de 30 dias fora da comparação por padrão
- Exclusão de conta com anonimização da autoria dos preços

**Fora do MVP e por quê**

| Deixado de fora | Motivo |
| --------------- | ------ |
| Reputação, percentual de confiabilidade, moderação, denúncia | O acesso é aberto, mas o volume inicial é baixo e os primeiros usuários são pessoas próximas. A confirmação em um toque, somada à data do cadastro, já dá sinal suficiente; reputação e moderação entram quando a base crescer |
| Gamificação | Depende de reputação; e os primeiros usuários já têm motivação própria |
| OCR da etiqueta, foto como evidência | Conveniência, não viabilidade. Foto é também o único item que consome armazenamento de verdade |
| *Shrinkflation*, alertas, recomendação de alternativo | Dependem de histórico acumulado, que ainda não existe no lançamento |
| Condição da promoção, do tipo "leve 3 pague 2" | O MVP apenas marca que o preço é promocional. Basta para não confundir promoção com preço de prateleira, que era o risco real |
| Dividir a compra, cesta inteira | Exigem cobertura de preços que a base nova não terá |
| Consulta de preços offline | Só o cadastro é protegido contra falta de sinal; consultar exige conexão |
| Preço em tempo real | Exigiria integração com os mercados — inviável |

---

## 4. Ferramentas, Ambiente e Infraestrutura

### 4.1 Hardware

| Perfil | Tipo | Configuração | Observação |
| ------ | ---- | ------------ | ---------- |
| Usuário | Smartphone | Câmera traseira e navegador atualizado. GPS é opcional: sem ele o app funciona, apenas exige escolher o mercado na lista e o registro sai sem a marca de conferido | O cadastro acontece de pé, dentro do mercado, com o carrinho na mão |
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
| Base de produtos | Recorte brasileiro do dump do Open Food Facts importado ao Postgres, com a API pública como reserva | Definido |

**Por que PWA.** Publicar em loja custa US$ 25 uma vez na Google Play e US$ 99 por ano na
Apple, além do processo de revisão a cada versão. O PWA elimina os dois e permite
atualizar sem esperar aprovação.

**Por que importar a base em vez de só chamar a API.** O Open Food Facts publica dumps
diários sob licença aberta, e a própria política dele manda usar o dump para carga em massa,
reservando a API para escaneamento real. Importar um recorte brasileiro deixa a busca por
código de barras local: instantânea, sem depender de serviço externo e — o que mais pesa —
funcionando com o sinal ruim de dentro do mercado, que é onde o escaneamento acontece. A API
fica como reserva para código ausente do recorte, e o que ela devolver é gravado localmente,
de modo que a base cresce com o uso.

**Por que Supabase.** As consultas que dão razão ao produto — comparar cesta entre
mercados, histórico por produto, busca por proximidade — são relacionais. Um banco NoSQL
cobraria por documento lido e deixaria essas consultas desconfortáveis. O preço dessa
escolha é não vir com persistência offline pronta, o que aqui é coberto pela fila de
reenvio do cadastro.

---

## 5. Gerenciamento de Riscos

| # | Risco | Impacto | Prob. | Mitigação |
| - | ----- | :-----: | :---: | --------- |
| R1 | Uma terceira pessoa chega, encontra só os dados do autor e não vê utilidade | Médio | Média | O autor usa o app sozinho por algumas semanas antes de convidar alguém — compra semanal gera histórico próprio depressa. Convite só quando houver o que ver. É sequenciamento, não requisito |
| R2 | Contribuição decai e só o autor cadastra preços | Médio | Média | Esperado nos primeiros meses, por isso não é alto: o autor sustenta a base sozinho de início. Vira problema se persistir depois dos convites. Cadastro em poucos segundos como requisito de projeto; gamificação em versão futura |
| R3 | Mesmo produto ou mercado cadastrado com nomes diferentes fragmenta a comparação | Alto | Baixa | Código de barras como identidade do produto; itens sem código e mercados vêm de catálogos mantidos pelo autor, sem criação livre pelo usuário |
| R4 | Preço desatualizado leva a uma decisão de compra errada e queima a confiança no app | Alto | Média | Preço envelhece em vez de expirar: a idade fica sempre visível e os de mais de 30 dias saem da comparação por padrão. Confirmação em um toque renova a idade, já no MVP |
| R5 | Cobertura baixa da base pública para produtos vendidos no Brasil | Baixo | Média | Dados são gratuitos e importados, então não há custo nem dependência em tempo de uso. Cobertura baixa apenas empurra mais produtos para o preenchimento manual, que já é caminho previsto — o GTIN garante a identidade de qualquer jeito |
| R6 | Dados pessoais sob a LGPD: autoria dos registros e lista de compras, que revela hábito de consumo | Médio | Média | Coordenada do dispositivo nunca é gravada, então não há histórico de deslocamento; entrada sem cadastro, sem nome nem telefone; identidade do contribuidor não é exposta; exclusão de conta anonimiza a autoria. Finalidades declaradas na especificação |
| R7 | Mercados proíbem fotografar etiquetas nas lojas | Baixo | Média | Foto é opcional — o cadastro funciona sem evidência |
| R8 | Escopo grande para um projeto individual | Alto | Baixa | Mais de 20 horas semanais disponíveis e sem prazo externo; MVP enxuto mantém o escopo sob controle |
| R9 | PWA no iOS: o Safari não expõe a API nativa de leitura de código de barras, e notificações exigem o app instalado na tela inicial | Médio | Alta | Fallback de leitura em JavaScript; priorizar Android, majoritário no público inicial; testar em aparelho iOS real antes do lançamento. A instalação em si funciona, e é dela que depende a mitigação do R12 |
| R10 | Acesso aberto sem reputação permite inserir preços errados em massa | Médio | Baixa | Volume inicial baixo e usuários majoritariamente conhecidos; confirmação por outro usuário dá sinal; reputação e moderação entram se o problema aparecer |
| R11 | Fixação de GPS dentro do mercado é lenta ou imprecisa | Baixo | Alta | O GPS é sugestão e sinal, nunca condição: se falhar, custa um toque a mais para escolher o mercado na lista e o registro sai sem a marca de conferido. Medir o tempo real em campo antes de fechar o requisito de 15 segundos |
| R12 | Sessão anônima perdida por limpeza do armazenamento do navegador, levando junto a autoria dos registros | Médio | Média | Convite para instalar na tela inicial já nas primeiras visitas, o que isenta o app da limpeza automática no iOS; convite para vincular Google ou e-mail depois de alguns registros |

---

## 6. Canvas MVP

| Bloco | Conteúdo |
| ----- | -------- |
| **Proposta do MVP** | Um app onde as pessoas cadastram os preços que veem no mercado e consultam, pela lista de compras, onde cada item está mais barato |
| **Segmento de clientes** | Moradores de Goianésia–GO que fazem compra de supermercado. Começa com pessoas próximas ao autor, com acesso aberto a quem pedir |
| **Jornadas** | (1) No mercado: escanear o produto, digitar o valor e salvar, mesmo com sinal ruim. (2) Antes da compra: montar a lista e ver o mercado mais barato de cada item |
| **Funcionalidades** | A lista do MVP na §3.3, sem repetição aqui — duplicar a enumeração só cria duas versões que divergem |
| **Custo** | R$ 40 por ano, referentes ao domínio `.com.br`. Infraestrutura sem custo na fase inicial (Supabase Free e Cloudflare Pages) e sem taxa de loja de aplicativos por ser PWA |
| **Cronograma** | Sem prazo externo. Marcos estimados abaixo |
| **Métricas para validar hipóteses** | Preços cadastrados por semana; contribuidores ativos; cobertura, medida em produtos com preço válido por mercado; consultas por usuário por semana; diferença entre o menor e o maior preço válido de um mesmo produto |
| **Resultado esperado** | O autor passa a consultar o app antes de comprar e economiza de fato. Depois disso, os primeiros convidados mantêm a base atualizada sem depender só dele |

**Marcos estimados** — considerando cerca de 20 horas semanais e sem data fixa:

1. **Fundação** (1–2 semanas) — aplicar o esquema no Postgres; autenticação anônima;
   projeto React/Vite publicado como PWA. Vem primeiro porque não se carrega catálogo sem
   ter tabela onde colocar
2. **Carga** (uma tarde, quase sem código) — cadastrar os supermercados de Goianésia com
   endereço e coordenada, montar a lista de itens sem código de barras vendidos neles e
   importar o recorte brasileiro do dump do Open Food Facts, filtrando com DuckDB para país
   e as colunas de código, nome, marca e quantidade
3. **Cadastro** (3–4 semanas) — scanner de código de barras, integração com a base pública
   de produtos, seleção no catálogo, geolocalização do mercado, marcação de promoção, fila
   de reenvio
4. **Consulta** (2–3 semanas) — busca de produto, histórico, preço por unidade, lista de
   compras com o mercado mais barato por item, confirmação de preço
5. **Campo** (contínuo) — uso real em Goianésia com os primeiros usuários, ajustando o que
   o uso mostrar

A soma dá algo entre dois e três meses até o primeiro uso real. É estimativa otimista, não
compromisso: a fila de reenvio e o fallback do leitor de código de barras costumam consumir
mais do que aparentam.
