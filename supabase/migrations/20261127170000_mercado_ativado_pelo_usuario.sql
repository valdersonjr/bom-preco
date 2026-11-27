-- O usuário passa a liberar o mercado onde está (RD-10 revista, RF-54).
--
-- Até aqui todo mercado nascia de o mantenedor editar um CSV. Quem abria o app
-- fora dos mercados cadastrados não registrava nem via preço, e a saída era
-- "me avise que eu cadastro".
--
-- A regra original existia para impedir o mesmo mercado com dois nomes, que
-- quebra a comparação do mesmo jeito que produto duplicado. Ela continua
-- valendo, por outro caminho: o usuário **não escreve** mercado. Ele escolhe de
-- um catálogo importado do OpenStreetMap, e cada lugar desse catálogo tem um
-- identificador único. Dois usuários que ativam o mesmo lugar chegam à mesma
-- linha — a unicidade é do banco, não da boa vontade de quem cadastra.
--
-- O que o banco NÃO verifica é se a pessoa estava lá. A posição nunca chega ao
-- servidor (RD-13), então quem filtra "só os que estão perto" é o aparelho. O
-- que limita o abuso aqui é outra coisa: só se ativa o que existe no catálogo,
-- e há um teto por pessoa por dia. O pior que alguém consegue é ativar, de
-- longe, mercados que existem de verdade.

-- ---------------------------------------------------------------------------
-- Catálogo de candidatos: mercados que existem, ainda sem ninguém usando.
-- ---------------------------------------------------------------------------

create table mercado_candidato (
  -- "node/123", "way/456": tipo e número do objeto no OpenStreetMap.
  osm_id     text primary key,
  tipo       text not null,
  nome       text not null,
  endereco   text not null default '',
  latitude   double precision not null,
  longitude  double precision not null,
  cidade     text not null
);

create index mercado_candidato_cidade_idx on mercado_candidato (cidade);

alter table mercado_candidato enable row level security;
create policy candidato_leitura on mercado_candidato for select using (true);

-- Tabela nova nasce sem privilégio. Só leitura: quem escreve é o importador,
-- com a chave de serviço.
grant select on mercado_candidato to authenticated;

-- Onde o app atende, com o centro de cada cidade.
--
-- Serve para o aparelho descobrir sozinho em que cidade está, comparando a
-- própria posição com três ou quatro pontos, e só então pedir os candidatos
-- daquela cidade. O caminho óbvio — mandar a posição e receber os vizinhos —
-- faria a coordenada do usuário trafegar, que é o que a RD-13 proíbe.
create view cidade_atendida as
select cidade,
       avg(latitude)  as latitude,
       avg(longitude) as longitude,
       count(*)       as candidatos
  from mercado_candidato
 group by cidade;

grant select on cidade_atendida to authenticated;

-- ---------------------------------------------------------------------------
-- Mercado ativo ganha a origem.
-- ---------------------------------------------------------------------------

alter table mercado
  -- Único, e é isto que impede o mesmo lugar duas vezes. Nulo nos mercados que
  -- o mantenedor cadastrou à mão e que o OpenStreetMap não conhece.
  add column osm_id      text unique,
  -- Quem ativou: existe para tratar abuso e para o teto diário, nunca é
  -- mostrado. Vira nulo quando a conta é excluída, como a autoria dos preços.
  add column ativado_por uuid references perfil (id) on delete set null,
  add column ativado_em  timestamptz;

-- Ativa um candidato. O teto é de cinco por pessoa por dia: uma compra usa um.
create function ativar_mercado(p_osm_id text)
  returns uuid
  language plpgsql
  -- `definer` porque a política de `mercado` só deixa o mantenedor inserir, e
  -- isso continua: a única inserção de usuário é esta, com as regras abaixo.
  -- `search_path` fixo é obrigatório em função `definer`.
  security definer
  set search_path = public
as $$
declare
  v_mercado uuid;
  v_c       mercado_candidato%rowtype;
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;

  -- Já ativo: devolve o mesmo. É o caso de duas pessoas no mesmo mercado.
  select id into v_mercado from mercado where osm_id = p_osm_id;
  if found then
    return v_mercado;
  end if;

  select * into v_c from mercado_candidato where osm_id = p_osm_id;
  if not found then
    raise exception 'mercado fora do catálogo';
  end if;

  if (select count(*) from mercado
       where ativado_por = auth.uid()
         and ativado_em > now() - interval '1 day') >= 5 then
    raise exception 'limite diário de mercados ativados';
  end if;

  insert into mercado (nome, endereco, localizacao, cidade,
                       osm_id, ativado_por, ativado_em)
  values (v_c.nome, v_c.endereco,
          format('SRID=4326;POINT(%s %s)', v_c.longitude, v_c.latitude)
            ::extensions.geography,
          v_c.cidade, v_c.osm_id, auth.uid(), now())
  on conflict (osm_id) do nothing
  returning id into v_mercado;

  -- Outra sessão ativou no mesmo instante: a linha é a dela.
  if v_mercado is null then
    select id into v_mercado from mercado where osm_id = p_osm_id;
  end if;

  return v_mercado;
end;
$$;

revoke execute on function ativar_mercado(text) from public, anon;
grant  execute on function ativar_mercado(text) to authenticated;
