-- Perfil nasce junto com o usuário (RF-01, RF-37).
--
-- Por trigger, e não por chamada do cliente, para que seja impossível existir
-- usuário sem perfil: se o cliente falhasse entre o login e a inserção, o
-- registro de preço seguinte quebraria na chave estrangeira.

create function criar_perfil_para_novo_usuario() returns trigger as $$
begin
  insert into public.perfil (id, apelido, anonimo)
  values (
    new.id,
    'Comprador ' || lpad((floor(random() * 10000))::int::text, 4, '0'),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger criar_perfil_no_cadastro
  after insert on auth.users
  for each row execute function criar_perfil_para_novo_usuario();

-- Com o perfil vindo do trigger, o cliente nunca insere nessa tabela. Retirar
-- o privilégio elimina um caminho de escrita que não é mais usado por ninguém.
revoke insert on perfil from anon, authenticated;
drop policy perfil_escrita on perfil;
