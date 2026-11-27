-- A pessoa passa a enxergar os próprios registros de preço.
--
-- `registro_preco` não é legível pelo cliente, e isso continua: é a revogação
-- do privilégio que impõe o RNF-12. O efeito colateral era que ninguém via nem
-- o que ele mesmo tinha registrado — a tela de conta contava pelo armazenamento
-- do aparelho, e o número zerava ao trocar de celular mesmo com a conta
-- vinculada. E sem ler os próprios dados não há como entregá-los a quem pede
-- uma cópia (RF-51).
--
-- A porta nova é uma visão que já nasce filtrada por quem chama. Como as outras
-- duas, roda com os privilégios do dono, SEM security_invoker — é o que permite
-- manter a tabela revogada. O que muda é o filtro: `auth.uid()` lê o token da
-- requisição, então cada sessão só alcança as próprias linhas.
--
-- `security_barrier` impede que uma condição escrita pelo chamador seja
-- avaliada antes do filtro e vaze, por efeito colateral, linha de outra pessoa.
--
-- `usuario_id` não é projetado: quem lê já sabe quem é, e a coluna não tem por
-- que existir fora da tabela.

create view meus_registros with (security_barrier) as
select r.id, r.produto_id, r.mercado_id, r.valor, r.tipo,
       r.local_conferido, r.observado_em
  from registro_preco r
 where r.usuario_id = auth.uid();

grant select on meus_registros to authenticated;
