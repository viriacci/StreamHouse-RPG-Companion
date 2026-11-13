-- StreamHouseRPG: dodatkowe zabezpieczenia czatow i indeksy.
-- Wymaga migracji v7, v8, v9, v11.4. Bez danych uzytkownikow ani kluczy.

-- Serializacja wiadomosci jednego nadawcy zamyka obejscie limitu przez
-- wiele rownoczesnych zadan z roznych okien przegladarki.
create or replace function private.sh_dm_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or new.sender_id is distinct from (select auth.uid())
     or not private.sh_are_friends(new.sender_id,new.recipient_id) then
    raise exception 'Wiadomosci mozna wysylac tylko zaakceptowanym znajomym' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sh_dm:'||new.sender_id::text,0));
  new.created_at := pg_catalog.now();
  select count(*) into v_count from public.sh_direct_messages
  where sender_id=new.sender_id and created_at >= new.created_at - interval '1 minute';
  if v_count >= 30 then
    raise exception 'Limit 30 wiadomosci na minute' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.sh_dm_before_insert() from public, anon, authenticated;

-- Rozmowy w pokojach: max 30 wiadomosci tekstowych na minute na osobe.
-- Zdarzenia rzutow (kind='roll') nie podlegaja temu limitowi.
create or replace function private.sh_room_chat_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if new.kind not in ('chat','handout') then return new; end if;
  if (select auth.uid()) is null or new.actor_id is distinct from (select auth.uid())
     or not private.sh_is_member(new.campaign_id)
     or (new.kind='handout' and not private.sh_is_gm(new.campaign_id)) then
    raise exception 'Brak uprawnien do wiadomosci pokoju' using errcode='42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sh_room_chat:'||new.actor_id::text,0));
  new.created_at := pg_catalog.now();
  select count(*) into v_count from public.sh_room_events
  where actor_id=new.actor_id and kind in ('chat','handout')
    and created_at >= new.created_at - interval '1 minute';
  if v_count >= 30 then
    raise exception 'Limit 30 wiadomosci pokoju na minute' using errcode='22023';
  end if;
  return new;
end;
$$;
revoke all on function private.sh_room_chat_guard() from public, anon, authenticated;
drop trigger if exists sh_room_chat_guard on public.sh_room_events;
create trigger sh_room_chat_guard before insert on public.sh_room_events
for each row execute function private.sh_room_chat_guard();

-- Jeden predykat SELECT zamiast dwoch (wlasciciel lub zaakceptowany znajomy).
drop policy if exists sh_profiles_own_select on public.sh_profiles;
drop policy if exists sh_profiles_friend_read on public.sh_profiles;
create policy sh_profiles_owner_or_friend_read on public.sh_profiles
for select to authenticated
using(id=(select auth.uid()) or private.sh_are_friends(id,(select auth.uid())));

-- Indeksy dla kluczy obcych wskazanych przez doradce wydajnosci Supabase.
create index if not exists sh_cc_campaign_owner_fk_idx on public.sh_campaign_characters(campaign_id,owner_id);
create index if not exists sh_cc_character_owner_fk_idx on public.sh_campaign_characters(character_id,owner_id);
create index if not exists sh_invites_creator_fk_idx on public.sh_campaign_invites(creator_id);
create index if not exists sh_friends_requested_fk_idx on public.sh_friend_links(requested_by);
create index if not exists sh_charstate_updated_fk_idx on public.sh_room_character_state(updated_by);
create index if not exists sh_events_actor_fk_idx on public.sh_room_events(actor_id);
create index if not exists sh_presence_user_fk_idx on public.sh_room_presence(user_id);
create index if not exists sh_state_updated_fk_idx on public.sh_room_states(updated_by);