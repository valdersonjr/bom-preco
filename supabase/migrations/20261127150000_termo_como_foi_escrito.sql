-- O termo do item de qualquer marca guarda o que a pessoa escreveu.
--
-- A migração anterior dizia que `termo` chegava já dobrado, sem acento. Na tela
-- isso virou "Feijao Carioca" na lista de quem digitou "feijão carioca" — o app
-- corrigindo o português de quem escreve certo.
--
-- A coluna passa a guardar o texto com acento, em minúsculas e sem pontuação, e
-- a dobra sem acento acontece só na hora de casar com `produto.nome_busca`.
-- Nenhuma estrutura muda; o que muda é o contrato, e por isso fica registrado
-- na própria coluna. O preço é pequeno: "feijão" e "feijao" passam a ser dois
-- itens, se alguém escrever dos dois jeitos na mesma lista.

comment on column item_lista.termo is
  'Item de qualquer marca (RF-52): o termo como foi escrito, em minúsculas, com acento. A dobra sem acento é feita na leitura.';

comment on column item_compra.termo is
  'O termo do item de qualquer marca, como estava na lista quando a compra foi concluída.';
