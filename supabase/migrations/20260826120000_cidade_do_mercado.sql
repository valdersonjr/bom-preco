-- O mercado passa a saber em que cidade fica.
--
-- Até aqui o app inteiro vivia em Goianésia, e "a cidade toda" — o raio padrão
-- do RF-12 — era o conjunto de todos os mercados. Assim que existe mercado em
-- outra cidade, esses dois deixam de ser a mesma coisa: comparar preço entre
-- lojas a duzentos quilômetros de distância não é comparação, é ruído.
--
-- Preenche Goianésia em tudo que já existe, porque é onde tudo estava.

alter table mercado add column cidade text not null default 'Goianésia';

-- O padrão serviu para o retroativo; daqui em diante é escolha explícita, para
-- que cadastrar mercado em cidade nova não herde a cidade errada em silêncio.
alter table mercado alter column cidade drop default;

create index mercado_cidade_idx on mercado (cidade);
