-- StreamHouse v11.6: wszystkie dane konta sa zapisane w Supabase.
-- Cache w przegladarce jest wylacznie kopia po sprawdzeniu sesji Discord.
-- Bez zmian w danych istniejacych profili, kampanii i postaci.

alter table public.sh_profiles
  add column if not exists profile_title text not null default 'Kronikarz StreamHouse'
    check (char_length(profile_title) between 1 and 50),
  add column if not exists avatar_data text not null default ''
    check (char_length(avatar_data) <= 180000
      and (avatar_data = '' or avatar_data ~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$'));

create table if not exists public.sh_archive_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (char_length(client_id) between 1 and 100),
  name text not null check (char_length(btrim(name)) between 1 and 72),
  session_date date not null,
  campaign_name text not null default '' check (char_length(campaign_name) <= 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sh_archive_owner_client_unique unique (owner_id, client_id)
);
create index if not exists sh_archive_recent_owner_idx on public.sh_archive_entries(owner_id,session_date desc,id);
alter table public.sh_archive_entries enable row level security;

create policy sh_archive_owner_read on public.sh_archive_entries
 for select to authenticated using (owner_id=(select auth.uid()));
create policy sh_archive_owner_insert on public.sh_archive_entries
 for insert to authenticated with check (owner_id=(select auth.uid()));
create policy sh_archive_owner_update on public.sh_archive_entries
 for update to authenticated using (owner_id=(select auth.uid()))
 with check (owner_id=(select auth.uid()));
create policy sh_archive_owner_delete on public.sh_archive_entries
 for delete to authenticated using (owner_id=(select auth.uid()));

revoke all on public.sh_archive_entries from public, anon, authenticated;
grant select,insert,update,delete on public.sh_archive_entries to authenticated;
revoke all on public.sh_archive_entries from anon;
