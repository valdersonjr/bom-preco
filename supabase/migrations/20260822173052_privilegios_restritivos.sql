-- Privilégios: nega tudo, concede o necessário.
--
-- A migração anterior revogava privilégio caso a caso, num banco cujo padrão é
-- conceder tudo. Isso deixou dois furos: a visão registro_vigente, que projeta
-- usuario_id e recebeu GRANT ALL, expunha a autoria dos preços pela API REST,
-- violando o RNF-12; e TRUNCATE ficou concedido a papéis de cliente.
--
-- Aqui a lógica inverte: nada é acessível até ser concedido de propósito.
--
-- Papéis, no Supabase:
--   anon          — requisição sem sessão alguma
--   authenticated — qualquer sessão, INCLUSIVE a anônima do RF-01
--   service_role   — chave de serviço, ignora RLS. Nada muda para ela.
--
-- O app cria sessão anônima na primeira abertura, então todo uso real chega
-- como authenticated. O papel anon não precisa alcançar coisa alguma.

revoke all on all tables in schema public from anon, authenticated;

-- Impede que a próxima tabela criada volte a nascer aberta.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catálogos: todos leem. Escrita existe como privilégio para o mantenedor,
-- e é a política e_mantenedor() que decide quem de fato passa.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on rede    to authenticated;
grant select, insert, update, delete on mercado to authenticated;

-- Produto tem duas portas de escrita: o mantenedor cura o catálogo, e o
-- usuário comum preenche produto com GTIN ausente da base (RD-09). As duas
-- são separadas pelas políticas produto_admin e produto_insercao.
grant select, insert, update, delete on produto to authenticated;

-- ---------------------------------------------------------------------------
-- Perfil: cada um enxerga e edita o próprio. Sem delete — RF-40 passa por
-- função de servidor, com a chave de serviço.
-- ---------------------------------------------------------------------------

grant select, insert, update on perfil to authenticated;

-- ---------------------------------------------------------------------------
-- Preço e confirmação: só inserção. Sem select, para a autoria não vazar
-- (RNF-12); sem update nem delete, porque registro é imutável (RD-02).
-- ---------------------------------------------------------------------------

grant insert on registro_preco to authenticated;
grant insert on confirmacao    to authenticated;

-- ---------------------------------------------------------------------------
-- Visões. registro_vigente é intermediária: existe só para preco_publico
-- consumir, e ninguém de fora deve alcançá-la — é ela que carrega usuario_id.
-- ---------------------------------------------------------------------------

grant select on preco_publico to authenticated;

-- ---------------------------------------------------------------------------
-- Lista de compras: o dono faz tudo, e a política lista_dono restringe às
-- suas próprias.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on lista      to authenticated;
grant select, insert, update, delete on item_lista to authenticated;

-- ---------------------------------------------------------------------------
-- Sequências: nenhuma tabela usa serial, mas a revogação em massa acima não
-- cobre sequências. Deixado explícito para o dia em que alguma existir.
-- ---------------------------------------------------------------------------

revoke all on all sequences in schema public from anon, authenticated;
