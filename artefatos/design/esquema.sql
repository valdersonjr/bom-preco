-- Bom Preço — esquema inicial
-- Deriva de artefatos/requisitos/2-analise/modelo-de-dominio.md
-- As regras de domínio RD-xx estão anotadas onde são impostas.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Perfil: estende auth.users. Conta anônima nasce aqui (RF-01, RF-37).
-- ---------------------------------------------------------------------------

create table perfil (
  id          uuid primary key references auth.users (id) on delete cascade,
  apelido     text        not null,
  anonimo     boolean     not null default true,   -- falso após vincular identidade (RF-38)
  mantenedor  boolean     not null default false,
  criado_em   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rede e mercado. Só o mantenedor cria mercado (RD-10).
-- ---------------------------------------------------------------------------

create table rede (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique
);

create table mercado (
  id           uuid primary key default gen_random_uuid(),
  rede_id      uuid references rede (id),          -- nulo se independente (RD-01)
  nome         text not null,
  endereco     text not null,
  localizacao  extensions.geography(point, 4326) not null
);

create index mercado_localizacao_idx on mercado using gist (localizacao);

-- ---------------------------------------------------------------------------
-- Produto. Embalagens diferentes são produtos diferentes.
-- Sem GTIN só entra pelo catálogo curado (RD-08); com GTIN o usuário pode
-- preencher, porque o código garante a identidade (RD-09).
-- ---------------------------------------------------------------------------

create table produto (
  id              uuid primary key default gen_random_uuid(),
  gtin            text unique,                     -- nulo em granel
  nome            text    not null,
  marca           text,
  quantidade      numeric not null check (quantidade > 0),
  unidade_medida  text    not null
                  check (unidade_medida in ('kg', 'g', 'L', 'mL', 'un')),
  origem          text    not null
                  check (origem in ('dump', 'api', 'catalogo', 'usuario')),

  -- RD-05: comparação só dentro da mesma dimensão
  dimensao        text generated always as (
                    case unidade_medida
                      when 'kg' then 'massa'  when 'g'  then 'massa'
                      when 'L'  then 'volume' when 'mL' then 'volume'
                      else 'contagem'
                    end
                  ) stored,

  -- RD-06: massa em kg, volume em litro
  quantidade_base numeric generated always as (
                    case unidade_medida
                      when 'g'  then quantidade / 1000
                      when 'mL' then quantidade / 1000
                      else quantidade
                    end
                  ) stored,

  criado_em       timestamptz not null default now()
);

create index produto_nome_idx on produto using gin (to_tsvector('portuguese', nome));

-- ---------------------------------------------------------------------------
-- Registro de preço: fato imutável (RD-02). Correção se faz com registro novo.
-- O id vem do cliente, para o reenvio da fila offline ser idempotente.
-- ---------------------------------------------------------------------------

create table registro_preco (
  id              uuid primary key,                -- gerado no dispositivo
  produto_id      uuid    not null references produto (id),
  mercado_id      uuid    not null references mercado (id),
  usuario_id      uuid    references perfil (id) on delete set null,  -- RD-11
  valor           numeric not null check (valor > 0),
  tipo            text    not null default 'tabela'
                  check (tipo in ('tabela', 'promocional')),          -- RD-07
  condicao        text,                            -- "leve 3 pague 2", fora do MVP
  local_conferido boolean not null default false,  -- RF-41, calculado no dispositivo
  observado_em    timestamptz not null,            -- instante da observação, não do envio
  criado_em       timestamptz not null default now()
);

create index registro_produto_mercado_idx
  on registro_preco (produto_id, mercado_id, observado_em desc);

-- ---------------------------------------------------------------------------
-- Confirmação. Autoconfirmação é permitida, mas marcada (RD-03).
-- ---------------------------------------------------------------------------

create table confirmacao (
  id              uuid primary key default gen_random_uuid(),
  registro_id     uuid not null references registro_preco (id) on delete cascade,
  usuario_id      uuid references perfil (id) on delete set null,
  autoconfirmacao boolean not null default false,
  confirmado_em   timestamptz not null default now(),
  dia             date not null,                   -- preenchido pelo trigger

  -- Uma confirmação por pessoa, por registro, por dia. Não pode ser uma por
  -- pessoa e registro: o autor precisa renovar a idade do próprio preço mês a
  -- mês enquanto houver poucos usuários, que é a razão de RD-03 existir.
  unique (registro_id, usuario_id, dia)
);

-- Marca a autoconfirmação e fixa o dia na inserção. A marca precisa ser gravada
-- aqui para o sinal sobreviver à anonimização da autoria na exclusão da conta;
-- o dia precisa ser coluna porque conversão de fuso não é imutável e portanto
-- não pode entrar num índice.
create function preparar_confirmacao() returns trigger as $$
begin
  new.dia := (new.confirmado_em at time zone 'America/Sao_Paulo')::date;
  new.autoconfirmacao := exists (
    select 1 from registro_preco r
     where r.id = new.registro_id and r.usuario_id = new.usuario_id
  );
  return new;
end;
$$ language plpgsql;

create trigger confirmacao_preparar
  before insert on confirmacao
  for each row execute function preparar_confirmacao();

-- ---------------------------------------------------------------------------
-- Lista de compras. Exclusão lógica pelo dono; some de vez com a conta (RD-12).
-- ---------------------------------------------------------------------------

create table lista (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references perfil (id) on delete cascade,
  nome        text not null,
  excluida_em timestamptz,
  criado_em   timestamptz not null default now()
);

create table item_lista (
  id          uuid primary key default gen_random_uuid(),
  lista_id    uuid    not null references lista (id) on delete cascade,
  produto_id  uuid    not null references produto (id),
  quantidade  numeric not null default 1 check (quantidade > 0),
  unique (lista_id, produto_id)
);

-- ---------------------------------------------------------------------------
-- Visões
-- ---------------------------------------------------------------------------

-- RD-04: entre vários registros do mesmo usuário para o mesmo produto e mercado
-- no mesmo dia, vale o mais recente. Os superados ficam gravados, fora daqui.
-- Estas duas visões são deliberadamente SEM security_invoker: elas rodam com os
-- privilégios do dono, e é justamente isso que permite revogar o acesso direto
-- às tabelas mais abaixo. A visão passa a ser a única porta de leitura, e a
-- projeção de colunas dela é o que impõe o RNF-12.
create view registro_vigente as
select distinct on (
         usuario_id, produto_id, mercado_id,
         (observado_em at time zone 'America/Sao_Paulo')::date
       ) *
  from registro_preco
 order by usuario_id, produto_id, mercado_id,
          (observado_em at time zone 'America/Sao_Paulo')::date,
          observado_em desc;

-- Idade = tempo desde a observação ou a última confirmação.
-- RNF-12: usuario_id não aparece — a autoria não é exposta.
create view preco_publico as
select r.id, r.produto_id, r.mercado_id, r.valor, r.tipo, r.condicao,
       r.local_conferido, r.observado_em,
       greatest(r.observado_em, coalesce(max(c.confirmado_em), r.observado_em))
         as visto_em,
       count(c.id) filter (where not c.autoconfirmacao) as confirmacoes_terceiros,
       count(c.id) filter (where c.autoconfirmacao)     as autoconfirmacoes
  from registro_vigente r
  left join confirmacao c on c.registro_id = r.id
 group by r.id, r.produto_id, r.mercado_id, r.valor, r.tipo, r.condicao,
          r.local_conferido, r.observado_em;

-- ---------------------------------------------------------------------------
-- Políticas de acesso. A matriz completa está em design.md.
-- Ausência de policy de update ou delete é o que impõe RD-02.
-- ---------------------------------------------------------------------------

alter table perfil         enable row level security;
alter table rede           enable row level security;
alter table mercado        enable row level security;
alter table produto        enable row level security;
alter table registro_preco enable row level security;
alter table confirmacao    enable row level security;
alter table lista          enable row level security;
alter table item_lista     enable row level security;

-- security definer para poder ler perfil sem esbarrar na própria política.
-- search_path fixo é obrigatório aqui: sem ele a função fica exposta a sequestro
-- de resolução de nome.
create function e_mantenedor() returns boolean as $$
  select coalesce((select mantenedor from perfil where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- Perfil: cada um enxerga e edita o próprio.
create policy perfil_leitura   on perfil for select using (id = auth.uid());
create policy perfil_escrita   on perfil for insert with check (id = auth.uid());
create policy perfil_alteracao on perfil for update using (id = auth.uid());

-- Catálogos: todos leem, só o mantenedor escreve (RD-10).
create policy rede_leitura    on rede    for select using (true);
create policy rede_admin      on rede    for all    using (e_mantenedor());
create policy mercado_leitura on mercado for select using (true);
create policy mercado_admin   on mercado for all    using (e_mantenedor());

-- Produto: todos leem. Usuário só cria se tiver GTIN (RD-08, RD-09).
create policy produto_leitura on produto for select using (true);
create policy produto_insercao on produto for insert
  with check (gtin is not null and origem in ('api', 'usuario'));
create policy produto_admin   on produto for all using (e_mantenedor());

-- Preço e confirmação: cada um insere o seu. Sem update nem delete (RD-02).
-- Não há política de select porque o cliente não lê estas tabelas — ver os
-- privilégios logo abaixo.
create policy preco_insercao on registro_preco for insert
  with check (usuario_id = auth.uid());

create policy conf_insercao on confirmacao for insert
  with check (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privilégios. Política de acesso controla QUAIS LINHAS; privilégio controla
-- SE A TABELA é alcançável. O RNF-12 depende do segundo: enquanto o cliente
-- puder consultar registro_preco direto pela API REST gerada, ele enxerga
-- usuario_id, e a visão que omite a coluna não protege nada.
-- ---------------------------------------------------------------------------

revoke select on registro_preco from anon, authenticated;
revoke select on confirmacao    from anon, authenticated;

grant insert on registro_preco to anon, authenticated;
grant insert on confirmacao    to anon, authenticated;

grant select on preco_publico  to anon, authenticated;

-- Lista: estritamente privada do dono.
create policy lista_dono on lista for all using (usuario_id = auth.uid());
create policy item_dono  on item_lista for all using (
  exists (select 1 from lista l where l.id = lista_id and l.usuario_id = auth.uid())
);
