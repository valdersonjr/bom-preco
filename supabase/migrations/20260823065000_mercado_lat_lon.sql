-- Latitude e longitude como números, ao lado da geometria.
--
-- `geography` é o tipo certo para o banco: guarda o ponto sem ambiguidade e
-- serve a consulta por proximidade no servidor mais adiante. Mas o PostgREST
-- serializa geography como hexadecimal do PostGIS — `0101000020E6100000…` —, e
-- o cliente teria de decodificar EWKB só para saber onde fica o mercado.
--
-- Colunas geradas resolvem: o banco continua com a geometria, o cliente recebe
-- dois números. E por serem geradas, não há como divergirem.
--
-- Tipo e função vêm qualificados com o schema `extensions`: o PostGIS mora lá
-- no Supabase, e coluna gerada não enxerga o search_path da sessão.

alter table mercado
  add column latitude double precision
    generated always as (extensions.st_y(localizacao::extensions.geometry)) stored,
  add column longitude double precision
    generated always as (extensions.st_x(localizacao::extensions.geometry)) stored;

comment on column mercado.latitude is
  'Derivada de localizacao. Nula quando ninguém mediu no local.';
