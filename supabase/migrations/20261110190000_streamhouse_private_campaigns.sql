-- StreamHouse RPG Companion v7: prywatne postacie i zaproszenia do kampanii.
-- Uruchom TYLKO w projekcie przeznaczonym dla StreamHouse.
-- Funkcje SECURITY DEFINER są celowo ograniczone, nie w schemacie API.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.sh_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Awanturnik' check (char_length(display_name) between 1 and 40),
  avatar_url text not null default '' check (char_length(avatar_url) <= 2048),
  updated_at timestamptz not null default now()
);
create table if not exists public.sh_characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 80),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 1000000),
  updated_at timestamptz not null default now(),
  unique (owner_id,client_id),
  unique (id,owner_id)
);
create table if not exists public.sh_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100),
  title text not null check (char_length(title) between 1 and 90),
  description text not null default '' check (char_length(description) <= 1000),
  currency text not null default 'Sztuki złota' check (char_length(currency) <= 50),
  created_at timestamptz not null default now(),
  unique (owner_id,client_id)
);
create table if not exists public.sh_campaign_members (
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('gm','player')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);
create table if not exists public.sh_campaign_characters (
  campaign_id uuid not null,
  character_id uuid not null,
  owner_id uuid not null,
  shared_at timestamptz not null default now(),
  primary key (campaign_id,character_id),
  foreign key (campaign_id,owner_id) references public.sh_campaign_members(campaign_id,user_id) on delete cascade,
  foreign key (character_id,owner_id) references public.sh_characters(id,owner_id) on delete cascade
);
create table if not exists public.sh_campaign_invites (
  token text primary key check (char_length(token) = 32),
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 20 check (max_uses between 1 and 100),
  uses integer not null default 0 check (uses >= 0)
);
create index if not exists sh_campaign_members_user_idx on public.sh_campaign_members(user_id,campaign_id);
create index if not exists sh_campaign_characters_owner_idx on public.sh_campaign_characters(owner_id);
create index if not exists sh_campaign_invites_campaign_idx on public.sh_campaign_invites(campaign_id);

-- Wyłącznie lookup bieżącego użytkownika. Funkcje prywatne nie przyjmują user_id.
create or replace function private.sh_is_member(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.sh_campaign_members m
    where m.campaign_id=p_campaign_id and m.user_id=(select auth.uid())
  );
$$;
create or replace function private.sh_is_gm(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.sh_campaigns c
    where c.id=p_campaign_id and c.owner_id=(select auth.uid())
  );
$$;
revoke all on function private.sh_is_member(uuid) from public, anon;
revoke all on function private.sh_is_gm(uuid) from public, anon;
grant execute on function private.sh_is_member(uuid) to authenticated;
grant execute on function private.sh_is_gm(uuid) to authenticated;

-- Członkostwo MG ustawiane po utworzeniu kampanii.
create or replace function private.sh_enroll_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.sh_campaign_members(campaign_id,user_id,role)
  values(new.id,new.owner_id,'gm');
  return new;
end;
$$;
revoke all on function private.sh_enroll_owner() from public, anon, authenticated;
drop trigger if exists sh_campaign_enroll_owner on public.sh_campaigns;
create trigger sh_campaign_enroll_owner after insert on public.sh_campaigns
for each row execute function private.sh_enroll_owner();

alter table public.sh_profiles enable row level security;
alter table public.sh_characters enable row level security;
alter table public.sh_campaigns enable row level security;
alter table public.sh_campaign_members enable row level security;
alter table public.sh_campaign_characters enable row level security;
alter table public.sh_campaign_invites enable row level security;

create policy "sh_profiles_own_select" on public.sh_profiles for select to authenticated using(id=(select auth.uid()));
create policy "sh_profiles_own_insert" on public.sh_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "sh_profiles_own_update" on public.sh_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

create policy "sh_characters_owner_or_shared_select" on public.sh_characters for select to authenticated using(
  owner_id=(select auth.uid()) or exists(
    select 1 from public.sh_campaign_characters cc
    where cc.character_id=sh_characters.id and private.sh_is_member(cc.campaign_id)
  )
);
create policy "sh_characters_owner_insert" on public.sh_characters for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "sh_characters_owner_update" on public.sh_characters for update to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "sh_characters_owner_delete" on public.sh_characters for delete to authenticated using(owner_id=(select auth.uid()));

create policy "sh_campaigns_member_select" on public.sh_campaigns for select to authenticated
using(owner_id=(select auth.uid()) or private.sh_is_member(id));
create policy "sh_campaigns_owner_insert" on public.sh_campaigns for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "sh_campaigns_owner_update" on public.sh_campaigns for update to authenticated
using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "sh_campaigns_owner_delete" on public.sh_campaigns for delete to authenticated using(owner_id=(select auth.uid()));
create policy "sh_campaign_members_member_select" on public.sh_campaign_members for select to authenticated
using(private.sh_is_member(campaign_id));
-- Celowo bez INSERT/UPDATE/DELETE na członkostwie: tylko bezpieczne RPC.
create policy "sh_shared_chars_member_select" on public.sh_campaign_characters for select to authenticated
using(private.sh_is_member(campaign_id));
create policy "sh_shared_chars_owner_insert" on public.sh_campaign_characters for insert to authenticated
with check(owner_id=(select auth.uid()) and private.sh_is_member(campaign_id));
create policy "sh_shared_chars_owner_or_gm_delete" on public.sh_campaign_characters for delete to authenticated
using(owner_id=(select auth.uid()) or private.sh_is_gm(campaign_id));
-- Zaproszenia nie mają żadnej polityki SELECT ani INSERT dla użytkownika.

-- Losowy kod 128-bit, ważny 7 dni, domyślnie 20 wykorzystań.
create or replace function public.sh_create_invite(p_campaign_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if (select auth.uid()) is null or not private.sh_is_gm(p_campaign_id) then
    raise exception 'Brak uprawnien do zapraszania' using errcode='42501';
  end if;
  v_token := pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-','');
  insert into public.sh_campaign_invites(token,campaign_id,creator_id)
  values(v_token,p_campaign_id,(select auth.uid()));
  return v_token;
end;
$$;
create or replace function public.sh_join_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.sh_campaign_invites%rowtype; v_added integer;
begin
  if (select auth.uid()) is null or p_code is null or p_code !~ '^[a-f0-9]{32}$' then
    raise exception 'Nieprawidlowy kod zaproszenia' using errcode='22023';
  end if;
  select * into v_invite from public.sh_campaign_invites
    where token=p_code for update;
  if not found or v_invite.expires_at <= pg_catalog.now() or v_invite.uses >= v_invite.max_uses then
    raise exception 'Kod wygasl albo nie istnieje' using errcode='22023';
  end if;
  insert into public.sh_campaign_members(campaign_id,user_id,role)
  values(v_invite.campaign_id,(select auth.uid()),'player')
  on conflict(campaign_id,user_id) do nothing;
  get diagnostics v_added = row_count;
  if v_added > 0 then
    update public.sh_campaign_invites set uses=uses+1 where token=p_code;
  end if;
  return v_invite.campaign_id;
end;
$$;
revoke all on function public.sh_create_invite(uuid) from public, anon;
revoke all on function public.sh_join_by_code(text) from public, anon;
grant execute on function public.sh_create_invite(uuid) to authenticated;
grant execute on function public.sh_join_by_code(text) to authenticated;

-- Jawne GRANT-y dla projektów z ograniczonym Data API. RLS nadal filtruje wiersze.
grant select,insert,update on public.sh_profiles to authenticated;
grant select,insert,update,delete on public.sh_characters to authenticated;
grant select,insert,update,delete on public.sh_campaigns to authenticated;
grant select on public.sh_campaign_members to authenticated;
grant select,insert,delete on public.sh_campaign_characters to authenticated;
revoke all on public.sh_campaign_invites from anon,authenticated;
revoke all on public.sh_profiles, public.sh_characters, public.sh_campaigns,
  public.sh_campaign_members, public.sh_campaign_characters from anon;
