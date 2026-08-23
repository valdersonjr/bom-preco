-- Mercado pode existir sem coordenada conhecida.
--
-- O catálogo de Goianésia mostrou o caso: há mercado com endereço certo e
-- coordenada que ninguém mediu. Geocodificar número em avenida longa erra
-- centenas de metros, e coordenada errada é pior que ausente — o app sugeriria
-- a loja errada e marcaria "conferido no local" indevidamente, que é o oposto
-- do sinal de confiança que RF-41 pretende dar.
--
-- Sem coordenada, o mercado continua utilizável: aparece na lista, recebe
-- preço, entra na comparação. Só não é sugerido por proximidade nem confirma
-- presença. É a mesma degradação que já vale quando o GPS falha — o GPS é
-- sinal, nunca porteiro.

alter table mercado alter column localizacao drop not null;

comment on column mercado.localizacao is
  'Nulo quando ninguém mediu no local. Mercado sem coordenada não é sugerido '
  'por proximidade e não recebe a marca de conferido no local.';
