-- Compra concluída: o que saiu do carrinho, guardado.
--
-- A marca de "já peguei" morava só em `item_lista.pego_em`, e desmarcar a
-- apagava. Terminada a compra, os itens ficavam acumulados no carrinho para
-- sempre ou eram tirados um a um — e em nenhum dos dois casos sobrava registro
-- de que aquilo tinha sido comprado. É esse histórico que deixa o app, com uma
-- pessoa só, aprender o que ela costuma levar (RF-50).
--
-- É dado privado, do mesmo peso da lista: revela hábito de consumo. Só o dono
-- lê, e a exclusão da conta remove de fato, por cascata. Está na tabela de
-- finalidades da especificação, §6.
--
-- O mercado é o identificador de uma loja do catálogo, e é anulável: a compra
-- vale mesmo sem saber onde foi. Coordenada não entra (RD-13).

create table compra (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references perfil (id) on delete cascade,
  mercado_id   uuid references mercado (id),
  concluida_em timestamptz not null default now()
);

create index compra_usuario_idx on compra (usuario_id, concluida_em desc);

create table item_compra (
  id          uuid primary key default gen_random_uuid(),
  compra_id   uuid    not null references compra (id) on delete cascade,
  produto_id  uuid    not null references produto (id),
  quantidade  numeric not null check (quantidade > 0)
);

create index item_compra_compra_idx on item_compra (compra_id);

alter table compra      enable row level security;
alter table item_compra enable row level security;

create policy compra_dono on compra for all using (usuario_id = auth.uid());
create policy item_compra_dono on item_compra for all using (
  exists (select 1 from compra c where c.id = compra_id and c.usuario_id = auth.uid())
);

-- Tabela nova nasce sem privilégio. Sem update: compra feita não se edita;
-- quem errou desfaz (delete) e conclui de novo.
grant select, insert, delete on compra      to authenticated;
grant select, insert, delete on item_compra to authenticated;

-- Concluir é uma operação só, no banco, e não três idas do cliente.
--
-- Gravar a compra, copiar os itens e tirá-los da lista precisam acontecer
-- juntos: com o sinal de dentro do mercado, a segunda ida falha depois de a
-- primeira ter passado, e a pessoa ficaria com a compra gravada e o carrinho
-- ainda cheio — ou pior, com o carrinho vazio e compra nenhuma.
--
-- `security invoker`: roda com os privilégios de quem chama, então as mesmas
-- políticas de dono valem aqui dentro. A função não abre porta nova.
create function concluir_compra(p_lista uuid, p_mercado uuid default null)
  returns uuid
  language plpgsql
  security invoker
  set search_path = public
as $$
declare
  v_compra uuid;
begin
  if not exists (
    select 1 from item_lista where lista_id = p_lista and pego_em is not null
  ) then
    return null;
  end if;

  insert into compra (usuario_id, mercado_id)
  values (auth.uid(), p_mercado)
  returning id into v_compra;

  insert into item_compra (compra_id, produto_id, quantidade)
  select v_compra, produto_id, quantidade
    from item_lista
   where lista_id = p_lista and pego_em is not null;

  delete from item_lista where lista_id = p_lista and pego_em is not null;

  return v_compra;
end;
$$;

-- Função nasce executável por todos; aqui vale a mesma inversão das tabelas.
revoke execute on function concluir_compra(uuid, uuid) from public, anon;
grant  execute on function concluir_compra(uuid, uuid) to authenticated;
