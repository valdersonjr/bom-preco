-- A concordância de preços passa a ser o sinal mais forte da confiança.
--
-- Na primeira versão, bater preço com outras contas pesava o mesmo que ter
-- conta antiga ou muitos registros: 0,20 cada. Só que os três não dizem a mesma
-- coisa. Idade e volume dizem que a pessoa existe e usa o app; concordância é o
-- único que diz se o que ela registra confere com o que outros viram. É o
-- sinal que uma conta falsa não fabrica sozinha.
--
--   antes   agora
--   0,30    0,20   piso
--   0,20    0,10   idade, cheia aos 30 dias
--   0,10    0,10   conta vinculada
--   0,20    0,20   volume, cheio aos 20 preços
--   0,20    0,40   concordância com outras contas
--
-- O que isso muda nos casos concretos:
--
--   conta nova, sem nada            0,40 — igual a antes; três confirmam
--   conta de 30 dias, sem preços    0,50 — era 0,60
--   conta antiga, vinculada, com 20 preços que batem   1,00 — confirma sozinha
--   a mesma conta, com preços que não batem            0,60 — era 0,80
--
-- Enquanto não houver 3 comparações possíveis, a concordância continua entrando
-- pela metade: quem ainda não foi conferido por ninguém não ganha nem perde.
--
-- Continuam provisórios, e continuam todos aqui.

create or replace function confianca_do_usuario(p_usuario uuid)
  returns numeric
  language sql
  stable
  security definer
  set search_path = public
as $$
  with conta as (
    select criado_em, anonimo from perfil where id = p_usuario
  ),
  volume as (
    select count(*) as n from registro_preco where usuario_id = p_usuario
  ),
  comparacoes as (
    select r.id,
           bool_or(abs(r.valor - o.valor) <= 0.10 * o.valor) as bate
      from registro_preco r
      join registro_preco o
        on o.produto_id = r.produto_id
       and o.mercado_id = r.mercado_id
       and o.tipo = r.tipo
       and o.usuario_id is distinct from r.usuario_id
       and o.usuario_id is not null
       and abs(extract(epoch from (r.observado_em - o.observado_em))) <= 7 * 86400
     where r.usuario_id = p_usuario
     group by r.id
  ),
  concordancia as (
    select count(*) as n, count(*) filter (where bate) as batem from comparacoes
  )
  select round((
           0.20
         + 0.10 * least(1, extract(epoch from (now() - conta.criado_em)) / (30 * 86400))
         + 0.10 * (case when conta.anonimo then 0 else 1 end)
         + 0.20 * least(1, volume.n / 20.0)
         + 0.40 * (case when concordancia.n >= 3
                        then concordancia.batem::numeric / concordancia.n
                        else 0.5 end)
         )::numeric, 2)
    from conta, volume, concordancia;
$$;

-- `create or replace` preserva os privilégios, mas a regra é não depender de
-- lembrar disso: esta função nunca é de cliente.
revoke execute on function confianca_do_usuario(uuid) from public, anon, authenticated;
