-- Lista de compras ganha ordem e a marca de "já peguei".
--
-- Duas faltas que só aparecem com a lista na mão dentro do mercado.
--
-- **Ordem.** A consulta não pedia nenhuma, então o Postgres devolvia o que
-- desse, e a lista podia se reorganizar entre um carregamento e outro. Quem
-- montou a lista andando pela cozinha deu uma ordem ao pensar; devolvê-la é
-- devolver esse raciocínio.
--
-- **Marca.** Sem poder riscar o que já está no carrinho, a lista serve para
-- planejar e não para comprar: a pessoa perde o lugar e confere tudo de novo a
-- cada corredor. Guardar o instante, e não um booleano, deixa saber *quando*
-- foi pego, que é o que permite desmarcar sem inventar estado.

alter table item_lista
  add column criado_em timestamptz not null default now(),
  add column pego_em   timestamptz;

create index item_lista_ordem_idx on item_lista (lista_id, criado_em);
