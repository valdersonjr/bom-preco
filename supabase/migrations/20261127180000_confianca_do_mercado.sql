-- Confiança do mercado a partir de vários sinais (RF-55).
--
-- Até aqui "dá para confiar na posição deste mercado?" tinha duas respostas,
-- ambas manuais: o mantenedor mediu, ou ninguém mediu. Dezessete mercados de
-- Goianésia estão na segunda, esperando uma ida a campo.
--
-- Esta migração deixa pronta a conta que cruza os sinais, para que ela comece a
-- valer sozinha quando houver gente usando:
--
--   fonte externa      o lugar existe no OpenStreetMap
--   mantenedor         a coordenada foi posta à mão por quem cura o catálogo
--   usuários           contas diferentes registraram preço ali com a marca de
--                      "conferido no local", cada uma pesando o quanto se
--                      confia nela
--
-- **Com a base de hoje, nada muda.** Todo mercado que tem coordenada veio do
-- OpenStreetMap ou do mantenedor, e qualquer um dos dois já basta. A conta só
-- passa a decidir alguma coisa quando um usuário marca o local de um mercado —
-- que é a segunda metade desta migração.
--
-- **Os pesos são provisórios.** Foram escolhidos sem dado nenhum, porque não há
-- dado: hoje existe um usuário e nenhum preço. Estão todos em
-- `confianca_do_usuario` e no limiar da visão, e devem ser revistos contra o
-- histórico quando ele existir — os registros são imutáveis, então a conta nova
-- poderá ser refeita sobre tudo o que foi gravado desde o primeiro dia.

-- ---------------------------------------------------------------------------
-- O usuário marca o local de um mercado que não tem coordenada.
-- ---------------------------------------------------------------------------

alter table mercado
  -- Quem marcou. Nulo quando a coordenada veio do catálogo ou do mantenedor.
  -- Nunca é mostrado; vira nulo quando a conta é excluída.
  add column local_marcado_por uuid references perfil (id) on delete set null,
  add column local_marcado_em  timestamptz;

-- É a única porta por onde uma coordenada de usuário chega ao banco, e é uma
-- exceção declarada à RD-13.
--
-- A RD-13 existe para o banco não acumular histórico de deslocamento, e isso
-- continua verdade: registrar preço, consultar e ativar mercado seguem sem
-- enviar posição. Aqui a pessoa toca em "Estou aqui agora", que é pedido
-- explícito, e a posição passa a ser a coordenada **do mercado**. Sobra no
-- banco um fato por marcação — "esta conta estava neste mercado neste instante"
-- —, e ele está na tabela de finalidades (§6).
--
-- Só marca onde não há coordenada: a de catálogo e a do mantenedor não são
-- sobrescritas por ninguém. Três por dia, porque uma compra passa por um
-- mercado, e porque conta anônima é de graça.
create function marcar_local_do_mercado(
  p_mercado uuid, p_latitude double precision, p_longitude double precision
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;

  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'coordenada inválida';
  end if;

  if (select count(*) from mercado
       where local_marcado_por = auth.uid()
         and local_marcado_em > now() - interval '1 day') >= 3 then
    raise exception 'limite diário de locais marcados';
  end if;

  update mercado
     set localizacao = format('SRID=4326;POINT(%s %s)', p_longitude, p_latitude)
                         ::extensions.geography,
         local_marcado_por = auth.uid(),
         local_marcado_em  = now()
   where id = p_mercado
     and localizacao is null;

  if not found then
    raise exception 'mercado inexistente ou já com local';
  end if;
end;
$$;

revoke execute on function marcar_local_do_mercado(uuid, double precision, double precision)
  from public, anon;
grant  execute on function marcar_local_do_mercado(uuid, double precision, double precision)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Quanto se confia numa conta, de 0 a 1.
-- ---------------------------------------------------------------------------

-- Tudo sai de dado que já existe; nada novo é coletado para isto.
--
--   0,30  piso: toda conta começa aqui
--   0,20  idade, cheia aos 30 dias — conta criada hoje para fraudar pesa pouco
--   0,10  conta vinculada a e-mail ou Google, que custa mais a descartar
--   0,20  volume, cheio aos 20 preços registrados
--   0,20  concordância: fração dos preços da pessoa que batem (até 10%) com o
--         de outra conta para o mesmo produto, mercado e tipo, a até 7 dias.
--         Com menos de 3 comparações possíveis não há o que medir, e entra a
--         metade — nem prêmio nem castigo por ainda não ter sido conferido
--
-- Uma conta nova e sozinha vale 0,40; três delas somam o bastante para
-- confirmar um mercado, e uma conta antiga, vinculada e que acerta vale por
-- quase todas as três.
--
-- NÃO é concedida a papel de cliente, e não deve ser: a confiança de uma pessoa
-- é juízo sobre ela, e a autoria não é exposta (RNF-12). Só a visão abaixo a
-- usa, e ela devolve o resultado por mercado, nunca por pessoa.
create function confianca_do_usuario(p_usuario uuid)
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
           0.30
         + 0.20 * least(1, extract(epoch from (now() - conta.criado_em)) / (30 * 86400))
         + 0.10 * (case when conta.anonimo then 0 else 1 end)
         + 0.20 * least(1, volume.n / 20.0)
         + 0.20 * (case when concordancia.n >= 3
                        then concordancia.batem::numeric / concordancia.n
                        else 0.5 end)
         )::numeric, 2)
    from conta, volume, concordancia;
$$;

revoke execute on function confianca_do_usuario(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Confiança do mercado: a soma dos sinais, e o que ela decide.
-- ---------------------------------------------------------------------------

-- Um ponto inteiro confirma. Fonte externa vale um ponto; coordenada do
-- mantenedor vale um ponto; cada conta diferente que registrou preço ali com
-- "conferido no local" vale a confiança dela. Quem marcou o local não conta
-- como confirmação do próprio alfinete.
--
-- A confirmação não envia posição: "conferido no local" é um booleano que o
-- aparelho calcula e que já sobe com cada preço desde o começo (RF-41).
--
-- Roda com os privilégios do dono, como `preco_publico`, porque lê
-- `registro_preco`, que o cliente não alcança. Devolve só o resultado por
-- mercado — nem quem confirmou, nem quanto cada um pesou.
create view mercado_confianca as
select m.id as mercado_id,
       case
         when m.localizacao is null then 'sem_local'
         when (case when m.osm_id is not null then 1 else 0 end)
            + (case when m.osm_id is null and m.local_marcado_por is null
                     and m.local_marcado_em is null then 1 else 0 end)
            + coalesce(u.soma, 0) >= 1 then 'confirmado'
         else 'a_confirmar'
       end as situacao
  from mercado m
  left join lateral (
    select sum(confianca_do_usuario(c.usuario_id)) as soma
      from (
        select distinct r.usuario_id
          from registro_preco r
         where r.mercado_id = m.id
           and r.local_conferido
           and r.usuario_id is not null
           and r.usuario_id is distinct from m.local_marcado_por
      ) c
  ) u on true;

grant select on mercado_confianca to authenticated;
