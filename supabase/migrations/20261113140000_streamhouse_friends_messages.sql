-- StreamHouse v11.4: zaproszenia znajomych i bezpieczne wiadomości prywatne.
-- WYMAGA migracji v7, v8 i v9. Nie uruchamiaj w obcej bazie.
-- Autoryzacja opiera się na auth.uid(), nie na nickach ani danych Discorda z klienta.

create table if not exists public.sh_friend_links (
  low_id uuid not null references auth.users(id) on delete cascade,
  high_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (low_id, high_id),
  constraint sh_friend_order check (low_id < high_id),
  constraint sh_friend_requester check (requested_by = low_id or requested_by = high_id)
);
create index if not exists sh_friend_links_high_idx on public.sh_friend_links(high_id,low_id);

create table if not exists public.sh_direct_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint sh_dm_no_self check(sender_id <> recipient_id)
);
create index if not exists sh_dm_sender_idx on public.sh_direct_messages(sender_id,recipient_id,id desc);
create index if not exists sh_dm_recipient_idx on public.sh_direct_messages(recipient_id,sender_id,id desc);

-- Funkcja wywoływana wyłącznie przez polityki RLS. Sprawdza dwustronną, zaakceptowaną znajomość.
create or replace function private.sh_are_friends(p_a uuid,p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_a is not null and p_b is not null and p_a <> p_b and exists (
    select 1 from public.sh_friend_links l
    where l.low_id = least(p_a,p_b) and l.high_id = greatest(p_a,p_b) and l.status = 'accepted'
  );
$$;
revoke all on function private.sh_are_friends(uuid,uuid) from public,anon;
grant execute on function private.sh_are_friends(uuid,uuid) to authenticated;

-- Dopisanie znajomości wymaga konkretnego UUID, co zapobiega zgadywaniu po nicku.
-- Lista może zawierać maksymalnie 20 oczekujących wychodzących zaproszeń.
create or replace function public.sh_friend_request(p_target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or p_target is null or p_target = v_user then
    raise exception 'Nieprawidlowy odbiorca zaproszenia' using errcode='22023';
  end if;
  if (select count(*) from public.sh_friend_links
       where requested_by = v_user and status = 'pending') >= 20 then
    raise exception 'Zbyt wiele oczekujacych zaproszen' using errcode='22023';
  end if;
  if exists (select 1 from public.sh_friend_links
             where low_id = least(v_user,p_target) and high_id = greatest(v_user,p_target)) then
    raise exception 'Zaproszenie albo znajomosc juz istnieje' using errcode='23505';
  end if;
  insert into public.sh_friend_links(low_id,high_id,requested_by)
    values(least(v_user,p_target),greatest(v_user,p_target),v_user);
end;
$$;

create or replace function public.sh_friend_respond(p_sender uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or p_sender is null or p_sender = v_user or p_accept is null then
    raise exception 'Nieprawidlowe zaproszenie' using errcode='22023';
  end if;
  if p_accept then
    update public.sh_friend_links set status='accepted',accepted_at=pg_catalog.now()
     where low_id=least(v_user,p_sender) and high_id=greatest(v_user,p_sender)
       and requested_by=p_sender and status='pending';
  else
    delete from public.sh_friend_links
     where low_id=least(v_user,p_sender) and high_id=greatest(v_user,p_sender)
       and requested_by=p_sender and status='pending';
  end if;
  if not found then
    raise exception 'Nie znaleziono oczekujacego zaproszenia' using errcode='22023';
  end if;
  return p_accept;
end;
$$;

create or replace function public.sh_friend_remove(p_peer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null or p_peer is null or p_peer = v_user then
    raise exception 'Nieprawidlowy kontakt' using errcode='22023';
  end if;
  delete from public.sh_friend_links
  where low_id=least(v_user,p_peer) and high_id=greatest(v_user,p_peer);
end;
$$;

revoke all on function public.sh_friend_request(uuid) from public,anon;
revoke all on function public.sh_friend_respond(uuid,boolean) from public,anon;
revoke all on function public.sh_friend_remove(uuid) from public,anon;
grant execute on function public.sh_friend_request(uuid) to authenticated;
grant execute on function public.sh_friend_respond(uuid,boolean) to authenticated;
grant execute on function public.sh_friend_remove(uuid) to authenticated;

-- Twardy limit szybkości wiadomości. Czas nadawany przez DB, a nie użytkownika.
create or replace function private.sh_dm_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or new.sender_id is distinct from (select auth.uid())
     or not private.sh_are_friends(new.sender_id,new.recipient_id) then
    raise exception 'Wiadomosci mozna wysylac tylko zaakceptowanym znajomym' using errcode='42501';
  end if;
  new.created_at := pg_catalog.now();
  select count(*) into v_count from public.sh_direct_messages
    where sender_id=new.sender_id and created_at >= new.created_at - interval '1 minute';
  if v_count >= 30 then
    raise exception 'Limit 30 wiadomosci na minute' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.sh_dm_before_insert() from public,anon,authenticated;
drop trigger if exists sh_dm_guard on public.sh_direct_messages;
create trigger sh_dm_guard before insert on public.sh_direct_messages
for each row execute function private.sh_dm_before_insert();

alter table public.sh_friend_links enable row level security;
alter table public.sh_direct_messages enable row level security;

-- Brak bezpośrednich uprawnień INSERT/UPDATE/DELETE na znajomościach, tylko weryfikujące RPC.
create policy sh_friend_links_participant_read on public.sh_friend_links
for select to authenticated using(low_id=(select auth.uid()) or high_id=(select auth.uid()));
create policy sh_dm_friends_read on public.sh_direct_messages
for select to authenticated
using((sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
  and private.sh_are_friends(sender_id,recipient_id));
create policy sh_dm_friends_write on public.sh_direct_messages
for insert to authenticated
with check(sender_id=(select auth.uid()) and private.sh_are_friends(sender_id,recipient_id));

-- Pozwól znajomym zobaczyć nazwę profilową, ale nie publikuj całej bazy kont.
create policy sh_profiles_friend_read on public.sh_profiles
for select to authenticated using(private.sh_are_friends(id,(select auth.uid())));

revoke all on public.sh_friend_links, public.sh_direct_messages from public,anon,authenticated;
grant select on public.sh_friend_links to authenticated;
grant select on public.sh_direct_messages to authenticated;
grant insert(sender_id,recipient_id,body) on public.sh_direct_messages to authenticated;
grant usage,select on sequence public.sh_direct_messages_id_seq to authenticated;
revoke all on public.sh_friend_links, public.sh_direct_messages from anon;

-- Realtime tylko zgodnie z RLS. W razie braku publication włącz ręcznie z panelu Supabase.
do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_friend_links') then
      execute 'alter publication supabase_realtime add table public.sh_friend_links';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_direct_messages') then
      execute 'alter publication supabase_realtime add table public.sh_direct_messages';
    end if;
  end if;
end $$;
