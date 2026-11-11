-- StreamHouse v9: stan postaci w kampanii. Wymaga migracji v7 i v8.
-- Nie modyfikuje kart źródłowych (sh_characters.payload) ani istniejącego świata sesji.
-- Uprawnienia: odczyt członkowie, zmiany tylko właściciel postaci albo MG.
create table if not exists public.sh_room_character_state (
  campaign_id uuid not null,
  character_id uuid not null,
  hp integer not null check (hp between 0 and 999),
  max_hp integer not null check (max_hp between 1 and 999),
  inventory jsonb not null default '[]'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (campaign_id, character_id),
  foreign key (campaign_id,character_id) references public.sh_campaign_characters(campaign_id,character_id) on delete cascade,
  constraint sh_session_hp_limit check (hp<=max_hp),
  constraint sh_session_inventory_limit check (jsonb_typeof(inventory)='array' and jsonb_array_length(inventory)<=100 and pg_column_size(inventory)<=12000),
  constraint sh_session_inventory_types check (not jsonb_path_exists(inventory, '$[*] ? (@.type() != "string")'))
);
create index if not exists sh_room_character_state_updated on public.sh_room_character_state(campaign_id,updated_at desc);
alter table public.sh_room_character_state enable row level security;
create policy sh_character_state_member_read on public.sh_room_character_state for select to authenticated
  using (private.sh_is_member(campaign_id));
-- Celowo brak polityki INSERT/UPDATE/DELETE. Zapis wyłącznie przez zweryfikowane RPC.
grant select on public.sh_room_character_state to authenticated;
revoke all on public.sh_room_character_state from anon;
revoke insert, update, delete on public.sh_room_character_state from authenticated;

create or replace function public.sh_room_save_character(
 p_campaign_id uuid,p_character_id uuid,p_revision bigint,p_hp integer,p_max_hp integer,p_inventory jsonb)
 returns bigint language plpgsql security definer set search_path = '' as $$
declare v_new bigint;
begin
  if (select auth.uid()) is null or not private.sh_is_member(p_campaign_id) then
    raise exception 'Brak dostępu do kampanii' using errcode='42501';
  end if;
  if not (private.sh_is_gm(p_campaign_id) or exists(
    select 1 from public.sh_campaign_characters cc
    where cc.campaign_id=p_campaign_id and cc.character_id=p_character_id and cc.owner_id=(select auth.uid())
  )) then
    raise exception 'Tylko MG lub właściciel postaci może zmieniać jej stan' using errcode='42501';
  end if;
  if not exists(select 1 from public.sh_campaign_characters cc
     where cc.campaign_id=p_campaign_id and cc.character_id=p_character_id) then
    raise exception 'Postać nie jest udostępniona tej kampanii' using errcode='42501';
  end if;
  if p_hp is null or p_max_hp is null or p_hp<0 or p_max_hp<1 or p_hp>p_max_hp or p_max_hp>999
    or p_inventory is null or pg_catalog.jsonb_typeof(p_inventory) <> 'array'
    or pg_catalog.jsonb_array_length(p_inventory)>100 or pg_catalog.pg_column_size(p_inventory)>12000
    or pg_catalog.jsonb_path_exists(p_inventory, '$[*] ? (@.type() != "string")')
    or exists(select 1 from pg_catalog.jsonb_array_elements_text(p_inventory) as item(v) where char_length(item.v)>160) then
    raise exception 'Niepoprawne HP lub wyposażenie' using errcode='22023';
  end if;
  if p_revision=-1 then
    insert into public.sh_room_character_state(campaign_id,character_id,hp,max_hp,inventory,updated_by)
      values(p_campaign_id,p_character_id,p_hp,p_max_hp,p_inventory,(select auth.uid()))
      on conflict do nothing returning revision into v_new;
  elsif p_revision>=0 then
    update public.sh_room_character_state set
      hp=p_hp,max_hp=p_max_hp,inventory=p_inventory,revision=revision+1,
      updated_by=(select auth.uid()),updated_at=pg_catalog.now()
    where campaign_id=p_campaign_id and character_id=p_character_id and revision=p_revision
    returning revision into v_new;
  end if;
  if v_new is null then raise exception 'Karta zmieniła się w innej karcie przeglądarki. Odśwież dane.' using errcode='P0001';end if;
  return v_new;
end;
$$;
revoke all on function public.sh_room_save_character(uuid,uuid,bigint,integer,integer,jsonb) from public,anon;
grant execute on function public.sh_room_save_character(uuid,uuid,bigint,integer,integer,jsonb) to authenticated;

-- Tylko zdarzenia tabeli z ochroną RLS. Jeśli publikacja nie istnieje, włącz w panelu Supabase.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_room_character_state') then
  execute 'alter publication supabase_realtime add table public.sh_room_character_state';
 end if;
end $$;
