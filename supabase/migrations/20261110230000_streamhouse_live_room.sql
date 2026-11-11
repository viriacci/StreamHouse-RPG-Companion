-- StreamHouse RPG Companion v8: bezpieczny pokoj sesji.
-- WYMAGA wczesniejszego uruchomienia migracji v7, nie uruchamiaj na przypadkowej bazie.
-- Tylko publiczne dane sceny trafiaja do sh_room_states. Prywatne notatki MG sa w osobnej tabeli.

create table if not exists public.sh_room_states (
  campaign_id uuid primary key references public.sh_campaigns(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null default '{"chapter":"Rozdział I","scene":"Wrota starej twierdzy","narration":"Drużyna stoi u bram dawno zapomnianej twierdzy.","theme":"fortress","sharedNote":"","initiative":[],"currentTurn":null,"tokens":[]}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint sh_room_payload_limit check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 40000)
);
create table if not exists public.sh_room_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('chat','roll','handout')),
  body text not null check (char_length(body) between 1 and 1200),
  meta jsonb not null default '{}'::jsonb check (jsonb_typeof(meta)='object' and pg_column_size(meta) <= 2500),
  created_at timestamptz not null default now()
);
create index if not exists sh_room_events_campaign_idx on public.sh_room_events(campaign_id,id desc);
create table if not exists public.sh_room_presence (
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  last_seen timestamptz not null default now(),
  primary key(campaign_id,user_id)
);
create table if not exists public.sh_room_gm_notes (
  campaign_id uuid primary key references public.sh_campaigns(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 8000),
  updated_at timestamptz not null default now()
);

-- Tworzy stan dla nowej kampanii. Dla starych kampanii jest bezpieczny backfill.
create or replace function private.sh_room_bootstrap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sh_room_states(campaign_id) values(new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.sh_room_bootstrap() from public,anon,authenticated;
drop trigger if exists sh_room_after_campaign on public.sh_campaigns;
create trigger sh_room_after_campaign after insert on public.sh_campaigns
for each row execute function private.sh_room_bootstrap();
insert into public.sh_room_states(campaign_id)
select id from public.sh_campaigns on conflict(campaign_id) do nothing;

-- Zmiana sceny: tylko wlasciciel kampanii, kontrola wersji zapobiega utracie zmian.
create or replace function public.sh_room_update(p_campaign_id uuid,p_revision bigint,p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_revision bigint;
begin
  if (select auth.uid()) is null or not private.sh_is_gm(p_campaign_id) then
    raise exception 'Tylko MG moze zmieniac stan sesji' using errcode = '42501';
  end if;
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or pg_catalog.pg_column_size(p_payload) > 40000 then
    raise exception 'Niepoprawny lub za duzy stan sesji' using errcode = '22023';
  end if;
  update public.sh_room_states
    set payload=p_payload, revision=revision+1, updated_by=(select auth.uid()), updated_at=pg_catalog.now()
    where campaign_id=p_campaign_id and revision=p_revision
    returning revision into new_revision;
  if new_revision is null then
    raise exception 'Konflikt wersji sesji; odswiez dane' using errcode = 'P0001';
  end if;
  return new_revision;
end;
$$;
revoke all on function public.sh_room_update(uuid,bigint,jsonb) from public,anon;
grant execute on function public.sh_room_update(uuid,bigint,jsonb) to authenticated;

-- Losowanie odbywa sie na serwerze, nie przez klienta. Serwer zapisuje wynik jako wydarzenie.
create or replace function public.sh_room_roll(p_campaign_id uuid,p_sides integer,p_modifier integer,p_label text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result_value integer; event_id bigint; label_safe text;
begin
  if (select auth.uid()) is null or not private.sh_is_member(p_campaign_id) then
    raise exception 'Nie jestes czlonkiem tej kampanii' using errcode='42501';
  end if;
  if p_sides not in (4,6,8,10,12,20,100) or p_modifier is null or p_modifier < -30 or p_modifier > 30 then
    raise exception 'Niepoprawne parametry rzutu' using errcode='22023';
  end if;
  label_safe := left(trim(coalesce(p_label,'')),60);
  if label_safe = '' then label_safe := 'Rzut D' || p_sides::text; end if;
  result_value := 1+floor(random()*p_sides)::integer;
  insert into public.sh_room_events(campaign_id,actor_id,kind,body,meta)
  values (p_campaign_id,(select auth.uid()),'roll',label_safe,
    jsonb_build_object('sides',p_sides,'value',result_value,'modifier',p_modifier,'total',result_value+p_modifier))
  returning id into event_id;
  return jsonb_build_object('id',event_id,'value',result_value,'total',result_value+p_modifier);
end;
$$;
revoke all on function public.sh_room_roll(uuid,integer,integer,text) from public,anon;
grant execute on function public.sh_room_roll(uuid,integer,integer,text) to authenticated;

-- Zegar aktywnosci zapisywany po stronie serwera, nie ze wskazan przegladarki.
create or replace function private.sh_presence_timestamp() returns trigger
language plpgsql set search_path = '' as $$
begin new.last_seen := pg_catalog.now(); return new; end;
$$;
revoke all on function private.sh_presence_timestamp() from public,anon,authenticated;
drop trigger if exists sh_room_presence_timestamp on public.sh_room_presence;
create trigger sh_room_presence_timestamp before insert or update on public.sh_room_presence
for each row execute function private.sh_presence_timestamp();

alter table public.sh_room_states enable row level security;
alter table public.sh_room_events enable row level security;
alter table public.sh_room_presence enable row level security;
alter table public.sh_room_gm_notes enable row level security;

create policy sh_room_state_members_read on public.sh_room_states for select to authenticated
using(private.sh_is_member(campaign_id));
-- Brak bezposredniego UPDATE/INSERT stanu z Data API. Tylko RPC GM.
create policy sh_room_events_members_read on public.sh_room_events for select to authenticated
using(private.sh_is_member(campaign_id));
create policy sh_room_events_chat_insert on public.sh_room_events for insert to authenticated
with check(actor_id=(select auth.uid()) and private.sh_is_member(campaign_id)
  and (kind='chat' and meta='{}'::jsonb or kind='handout' and private.sh_is_gm(campaign_id) and meta='{}'::jsonb));
create policy sh_room_presence_members_read on public.sh_room_presence for select to authenticated
using(private.sh_is_member(campaign_id));
create policy sh_room_presence_self_insert on public.sh_room_presence for insert to authenticated
with check(user_id=(select auth.uid()) and private.sh_is_member(campaign_id));
create policy sh_room_presence_self_update on public.sh_room_presence for update to authenticated
using(user_id=(select auth.uid()) and private.sh_is_member(campaign_id))
with check(user_id=(select auth.uid()) and private.sh_is_member(campaign_id));
create policy sh_room_notes_gm_read on public.sh_room_gm_notes for select to authenticated
using(private.sh_is_gm(campaign_id));
create policy sh_room_notes_gm_insert on public.sh_room_gm_notes for insert to authenticated
with check(private.sh_is_gm(campaign_id));
create policy sh_room_notes_gm_update on public.sh_room_gm_notes for update to authenticated
using(private.sh_is_gm(campaign_id)) with check(private.sh_is_gm(campaign_id));

grant select on public.sh_room_states to authenticated;
grant select,insert on public.sh_room_events to authenticated;
grant usage,select on sequence public.sh_room_events_id_seq to authenticated;
grant select,insert,update on public.sh_room_presence to authenticated;
grant select,insert,update on public.sh_room_gm_notes to authenticated;
revoke all on public.sh_room_states,public.sh_room_events,public.sh_room_presence,public.sh_room_gm_notes from anon;

-- Wlacz synchronizacje przez WebSocket (tylko SELECT zgodnie z RLS).
-- W razie braku uprawnien do modyfikacji publikacji: wlacz recznie w Dashboard > Database > Publications.
do $$ begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_room_states') then
      execute 'alter publication supabase_realtime add table public.sh_room_states';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_room_events') then
      execute 'alter publication supabase_realtime add table public.sh_room_events';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sh_room_presence') then
      execute 'alter publication supabase_realtime add table public.sh_room_presence';
    end if;
  end if;
end $$;
