-- Faz a consulta de preço usar índice em vez de varrer a tabela.
--
-- `registro_vigente` agrupava por (usuario_id, produto_id, mercado_id, dia).
-- A ordem dentro do `distinct on` não muda o resultado, mas manda no índice que
-- pode servi-lo: com `usuario_id` na frente, um filtro por `produto_id` não
-- alcança o índice e o banco ordena a tabela inteira antes de filtrar.
--
-- Toda leitura de preço no app filtra por produto. Ele passa a ser a primeira
-- coluna, e ganha um índice que casa exatamente com a ordenação da visão.

create or replace view registro_vigente as
select distinct on (
         produto_id, mercado_id, usuario_id,
         (observado_em at time zone 'America/Sao_Paulo')::date
       ) *
  from registro_preco
 order by produto_id, mercado_id, usuario_id,
          (observado_em at time zone 'America/Sao_Paulo')::date,
          observado_em desc;

create index registro_preco_vigente_idx on registro_preco (
  produto_id, mercado_id, usuario_id,
  ((observado_em at time zone 'America/Sao_Paulo')::date),
  observado_em desc
);
