-- Item de lista de qualquer marca (RF-52).
--
-- A lista só aceitava produto exato, e isso serve a quem tem marca fixa. Quem
-- compra o que estiver mais barato escreve "arroz" e recebia trinta embalagens
-- para escolher, tendo de adivinhar qual delas teria preço.
--
-- O item passa a apontar para um produto OU para um termo. O termo não é o
-- "produto genérico" da evolução prevista no modelo de domínio — aquele agrupa
-- marcas por curadoria, e curar doze mil produtos não é trabalho que caiba
-- agora. Aqui o agrupamento é feito na leitura, pelo nome: serve o produto cujo
-- nome contém todas as palavras do termo. É grosseiro, e por isso o item guarda
-- também o que a pessoa disse que não serve.

alter table item_lista
  alter column produto_id drop not null,
  -- Já dobrado e sem acento, como `produto.nome_busca`: é com ela que casa.
  add column termo text,
  -- Produtos que a pessoa recusou neste item. Vetor na própria linha, e não
  -- tabela: é uma lista curta, que só existe junto com o item e some com ele.
  add column excluidos uuid[] not null default '{}',
  add constraint item_lista_produto_ou_termo
    check ((produto_id is null) <> (termo is null));

-- RD-15 estendida: o mesmo termo aparece uma vez por lista, como o produto.
create unique index item_lista_termo_idx
  on item_lista (lista_id, termo) where termo is not null;

-- A compra concluída guarda o item como ele estava na lista.
alter table item_compra
  alter column produto_id drop not null,
  add column termo text,
  add constraint item_compra_produto_ou_termo
    check ((produto_id is null) <> (termo is null));

create or replace function concluir_compra(p_lista uuid, p_mercado uuid default null)
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

  insert into item_compra (compra_id, produto_id, termo, quantidade)
  select v_compra, produto_id, termo, quantidade
    from item_lista
   where lista_id = p_lista and pego_em is not null;

  delete from item_lista where lista_id = p_lista and pego_em is not null;

  return v_compra;
end;
$$;

-- Preços válidos dos produtos que servem a cada termo.
--
-- Função, e não consulta montada no cliente, por causa do tamanho: "arroz" casa
-- com centenas de produtos, e mandar centenas de identificadores num filtro
-- estoura a URL. Aqui o caminho é o inverso — parte-se dos poucos preços
-- recentes e fica-se com os que são de produto que serve.
--
-- `security invoker`: lê `produto` e `preco_publico` com os privilégios de quem
-- chama, que já os tem. A autoria continua fora, porque a visão não a projeta.
create function precos_por_termo(p_termos text[], p_desde timestamptz)
  returns table (
    termo text,
    produto_id uuid, gtin text, nome text, marca text,
    quantidade numeric, unidade_medida text,
    quantidade_base numeric, dimensao text,
    mercado_id uuid, valor numeric,
    visto_em timestamptz, observado_em timestamptz
  )
  language sql
  stable
  security invoker
  set search_path = public
as $$
  select t.termo,
         p.id, p.gtin, p.nome, p.marca,
         p.quantidade, p.unidade_medida,
         p.quantidade_base, p.dimensao,
         pp.mercado_id, pp.valor, pp.visto_em, pp.observado_em
    from unnest(p_termos) as t(termo)
    join preco_publico pp on pp.visto_em >= p_desde
    join produto p on p.id = pp.produto_id
   where not exists (
           select 1
             from unnest(string_to_array(t.termo, ' ')) as palavra
            where palavra <> ''
              and position(palavra in p.nome_busca) = 0
         );
$$;

revoke execute on function precos_por_termo(text[], timestamptz) from public, anon;
grant  execute on function precos_por_termo(text[], timestamptz) to authenticated;
