# Brainstorm — Bom Preço

Fonte: autor do produto (também usuário-alvo).
Registro bruto de ideias levantadas — sem filtro de viabilidade, prioridade ou escopo.

## Escaneamento e cadastro

- Escanear código de barras e ver o preço do mesmo produto em vários mercados
- Cadastro manual para produtos sem código de barras (hortifruti, açougue)
- Puxar nome, marca e imagem do produto automaticamente via base pública (Cosmos, Open Food Facts ou outra) ao escanear ou fotografar
- Foto da etiqueta de preço como evidência do cadastro
- Reconhecer o preço direto da foto da etiqueta (OCR), sem digitar
- Geolocalização automática para identificar em qual mercado o usuário está no momento do cadastro

## Preço e histórico

- Preço atual em tempo real por mercado, via integração com a API do mercado
- Histórico de preço por produto por mercado
- Preço por unidade (R$/kg, R$/litro) para comparar embalagens de tamanhos diferentes
- Detectar shrinkflation (produto encolheu, preço continua igual)
- Separar preço de tabela e preço promocional (leve 3 pague 2, desconto no app do mercado)
- Expirar o preço depois de X dias sem confirmação, marcando-o como desatualizado
- Alerta/notificação quando um produto acompanhado baixa de preço
- Recomendar a compra de um produto alternativo

## Confiabilidade dos dados

- Preço cadastrado pelo próprio usuário (dado colaborativo)
- Percentual de confiabilidade por preço cadastrado
- Reputação do usuário baseada no histórico de cadastros
- Botão "confirmo esse preço" para outros usuários validarem sem recadastrar
- Cruzar cadastros de pessoas diferentes para o mesmo produto/mercado/período e subir a confiança automaticamente
- Marcar como suspeito o preço muito fora da média histórica
- Time de moderação e flag de denúncia para preço errado

## Comparação e decisão de compra

- Lista de compras que mostra em qual mercado cada item está mais barato
- Sugestão de dividir a compra entre 2–3 mercados para economizar
- Comparar o total de uma cesta inteira entre mercados, não só item a item
- Levar em conta distância e tempo até o mercado ao decidir se vale ir atrás do preço menor
- Diferenciar preços por filial (mesma rede, lojas diferentes podem ter preço diferente)

## Rede e adoção (cold start)

- Importar base pública existente para já nascer com dados (ex.: Preço da Hora SP)
- Começar restrito a um grupo pequeno (autor + família/amigos que fazem compra junto)
- Gamificação: pontos e badges para quem contribui e é confiável

## Escopo do produto

- Uso pessoal/familiar ou aberto ao público geral
