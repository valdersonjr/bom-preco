-- `dia` deixa de ser obrigatório na inserção.
--
-- Quem preenche a coluna é o gatilho, antes da inserção, com o fuso correto.
-- Mas sem valor padrão o Postgres — e portanto os tipos gerados — a tratam como
-- obrigatória, e o cliente precisaria enviá-la só para o gatilho descartar.
--
-- O padrão nunca prevalece: o gatilho sobrescreve sempre. Ele existe para
-- tornar a coluna opcional no contrato da API, e como rede de segurança caso o
-- gatilho seja removido um dia.

alter table confirmacao alter column dia set default current_date;
