-- Eventos de uso: o mínimo para medir o que a Visão diz que valida o produto.
--
-- "Consultas por usuário por semana" está na lista de métricas da Visão §6 e
-- não havia como calculá-la: consultar um preço não deixava rastro. E a busca
-- que não acha nada é a melhor fonte para saber o que falta no catálogo — a
-- tela pedia "me avise que eu acrescento".
--
-- Três tipos, e a lista é fechada de propósito. Cada evento novo é dado novo
-- sobre a pessoa, e precisa passar pela tabela de finalidades (§6) antes de
-- existir — a restrição `check` obriga a mexer aqui, e mexer aqui lembra disso.
--
--   consulta_produto          a pessoa abriu os preços de um produto
--   busca_sem_resultado       o termo digitado não achou produto algum
--   codigo_fora_do_catalogo   o código de barras lido não existe na base
--
-- **Só o primeiro leva autor.** A métrica dele é por usuário. Os outros dois
-- são sobre o catálogo, não sobre quem buscou: sobem com `usuario_id` nulo, e
-- assim o texto de uma busca nunca fica ligado a uma pessoa.
--
-- O que não entra, e não deve entrar: coordenada (RD-13), e o termo de uma
-- busca que achou resultado — esse diz o que a pessoa compra, e para isso já
-- existe a lista, que ela controla.

create table evento (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid references perfil (id) on delete cascade,
  tipo        text not null check (
                tipo in ('consulta_produto', 'busca_sem_resultado',
                         'codigo_fora_do_catalogo')
              ),
  produto_id  uuid references produto (id),
  -- O termo que não achou nada, ou o código que não existe.
  termo       text,
  ocorrido_em timestamptz not null default now(),

  -- A regra de autoria acima, imposta: consulta tem autor e produto; os dois
  -- eventos de catálogo não têm autor e têm o texto.
  check (
    (tipo = 'consulta_produto'
       and usuario_id is not null and produto_id is not null and termo is null)
    or
    (tipo <> 'consulta_produto'
       and usuario_id is null and produto_id is null and termo is not null)
  )
);

create index evento_tipo_idx on evento (tipo, ocorrido_em desc);

alter table evento enable row level security;

create policy evento_insercao on evento for insert
  with check (usuario_id is null or usuario_id = auth.uid());

-- Só inserção. Sem select: nem os próprios eventos voltam para o cliente — quem
-- lê é o mantenedor, no banco. Sem update nem delete: evento é fato.
grant insert on evento to authenticated;
