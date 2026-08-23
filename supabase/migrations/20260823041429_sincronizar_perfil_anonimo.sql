-- Vincular identidade deixa a conta de ser anônima (RF-38).
--
-- A confirmação por e-mail acontece fora do app: a pessoa clica no link do
-- e-mail, e nesse instante o cliente pode nem estar aberto. Por isso a
-- sincronização é gatilho no banco, não chamada do cliente — do contrário
-- `perfil.anonimo` ficaria mentindo até a próxima vez que o app subisse.

create function sincronizar_anonimo_do_perfil() returns trigger as $$
begin
  update public.perfil
     set anonimo = coalesce(new.is_anonymous, false)
   where id = new.id
     and anonimo is distinct from coalesce(new.is_anonymous, false);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger sincronizar_perfil_anonimo
  after update on auth.users
  for each row execute function sincronizar_anonimo_do_perfil();
