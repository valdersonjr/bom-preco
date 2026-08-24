-- O gatilho da confirmação precisa ler `registro_preco`.
--
-- Ele consulta a autoria do registro para decidir se aquilo é autoconfirmação
-- (RD-03). Só que `registro_preco` teve o `select` revogado dos papéis de
-- cliente para proteger a autoria (RNF-12), e o gatilho rodava como o chamador
-- — então qualquer tentativa de confirmar preço falhava com permissão negada.
--
-- Efeito de segunda ordem do bloqueio de privilégios: proteger a leitura da
-- tabela também bloqueou quem tinha motivo legítimo para lê-la.
--
-- `security definer` resolve sem abrir nada: a função lê uma linha, devolve um
-- booleano, e nenhum dado de autoria chega ao cliente. `search_path` fixo é
-- obrigatório aqui, como em toda função com privilégio elevado.

create or replace function preparar_confirmacao() returns trigger as $$
begin
  new.dia := (new.confirmado_em at time zone 'America/Sao_Paulo')::date;
  new.autoconfirmacao := exists (
    select 1 from registro_preco r
     where r.id = new.registro_id and r.usuario_id = new.usuario_id
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
