-- Desempate determinístico do registro vigente (RD-04).
--
-- A visão escolhia o registro do dia por `observado_em desc`. Quando dois
-- registros da mesma pessoa, produto e mercado têm o mesmo instante observado —
-- caso real de quem digita errado e corrige em seguida, ou de dois itens que
-- saem da fila offline com o mesmo carimbo — a escolha ficava a critério do
-- planejador, e podia preservar o valor errado em vez da correção.
--
-- `criado_em` é sempre distinto e reflete a ordem de chegada, que é exatamente
-- o critério certo para desempatar: prevalece a última coisa que a pessoa
-- afirmou.

create or replace view registro_vigente as
select distinct on (
         usuario_id, produto_id, mercado_id,
         (observado_em at time zone 'America/Sao_Paulo')::date
       ) *
  from registro_preco
 order by usuario_id, produto_id, mercado_id,
          (observado_em at time zone 'America/Sao_Paulo')::date,
          observado_em desc,
          criado_em desc;
