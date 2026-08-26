-- Busca de produto deixa de depender de o acento bater.
--
-- O catálogo é colaborativo e tem "café" e "cafe" convivendo. Com `ilike` cru,
-- quem digita "feijao" acha um conjunto e quem digita "feijão" acha outro, e
-- nenhum dos dois é o conjunto certo. Não é que uma grafia funcione: é que cada
-- uma alcança só metade da prateleira.
--
-- `unaccent` sozinho não serve numa coluna gerada, porque depende de dicionário
-- e o Postgres o considera `stable`. Passando o dicionário explicitamente ele
-- vira determinístico, e o invólucro abaixo pode ser declarado `immutable`.

create extension if not exists unaccent with schema extensions;
-- `pg_trgm` é o que traz `gin_trgm_ops`, sem o qual o índice de trigrama não
-- existe e a busca por trecho volta a varrer doze mil linhas.
create extension if not exists pg_trgm with schema extensions;

create or replace function public.sem_acento(t text)
  returns text
  language sql
  immutable
  strict
  parallel safe
  as $$ select lower(extensions.unaccent('extensions.unaccent', t)) $$;

-- Coluna gerada em vez de índice funcional: o PostgREST filtra por coluna, não
-- por expressão, então o cliente precisa de algo com nome para consultar.
alter table produto
  add column nome_busca text
  generated always as (public.sem_acento(nome)) stored;

create index produto_nome_busca_idx on produto using gin (nome_busca extensions.gin_trgm_ops);
