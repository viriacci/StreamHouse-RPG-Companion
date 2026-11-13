-- StreamHouse v11.8: targeted friend invitations and GM-managed campaign roster.
-- Existing campaigns and memberships are retained. All changes are additive.

create table if not exists public.sh_campaign_direct_invites (
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (campaign_id,receiver_id),
  constraint sh_campaign_direct_invites_no_self check (inviter_id <> receiver_id)
);
create index if not exists sh_campaign_direct_invites_inbox_idx
  on public.sh_campaign_direct_invites(receiver_id,status,created_at desc);

-- A kicked player must not be able to rejoin using an old, still-valid shared link.
-- Only accepting a fresh, targeted invitation from the GM clears this restriction.
create table if not exists private.sh_campaign_removed_members (
  campaign_id uuid not null references public.sh_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  removed_by uuid not null references auth.users(id) on delete cascade,
  removed_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);
alter table private.sh_campaign_removed_members enable row level security;
revoke all on private.sh_campaign_removed_members from public,anon,authenticated;

create or replace function private.sh_prevent_removed_campaign_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from private.sh_campaign_removed_members r
    where r.campaign_id = new.campaign_id and r.user_id = new.user_id
  ) then
    raise exception 'Aby ponownie dolaczyc, popros MG o nowe zaproszenie osobiste'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.sh_prevent_removed_campaign_member() from public,anon,authenticated;
drop trigger if exists sh_prevent_removed_campaign_member on public.sh_campaign_members;
create trigger sh_prevent_removed_campaign_member
  before insert on public.sh_campaign_members
  for each row execute function private.sh_prevent_removed_campaign_member();

alter table public.sh_campaign_direct_invites enable row level security;
revoke all on public.sh_campaign_direct_invites from public,anon,authenticated;
grant select on public.sh_campaign_direct_invites to authenticated;
create policy sh_campaign_direct_invites_select on public.sh_campaign_direct_invites
  for select to authenticated
  using (receiver_id=(select auth.uid()) or private.sh_is_gm(campaign_id));
-- No INSERT/UPDATE/DELETE policies or grants: all writes go through checked RPCs.

create or replace function public.sh_campaign_invite_friend(p_campaign_id uuid,p_receiver_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid()); v_changed integer;
begin
  if v_me is null or p_campaign_id is null or p_receiver_id is null or p_receiver_id=v_me
     or not private.sh_is_gm(p_campaign_id) then
    raise exception 'Tylko MG moze zapraszac znajomych do kampanii' using errcode='42501';
  end if;
  if not private.sh_are_friends(v_me,p_receiver_id) then
    raise exception 'Mozesz zaprosic tylko zaakceptowanego znajomego' using errcode='42501';
  end if;
  if exists (select 1 from public.sh_campaign_members m where m.campaign_id=p_campaign_id and m.user_id=p_receiver_id) then
    raise exception 'Ten gracz jest juz czlonkiem kampanii' using errcode='22023';
  end if;
  if (select count(*) from public.sh_campaign_direct_invites
      where campaign_id=p_campaign_id and status='pending') >= 50 then
    raise exception 'Kampania ma za duzo oczekujacych zaproszen' using errcode='22023';
  end if;
  insert into public.sh_campaign_direct_invites(campaign_id,receiver_id,inviter_id)
  values (p_campaign_id,p_receiver_id,v_me)
  on conflict (campaign_id,receiver_id) do update
    set status='pending',inviter_id=excluded.inviter_id,created_at=pg_catalog.now(),responded_at=null
    where sh_campaign_direct_invites.status <> 'pending';
  get diagnostics v_changed = row_count;
  if v_changed = 0 then
    raise exception 'Zaproszenie do tej osoby juz oczekuje' using errcode='22023';
  end if;
end;
$$;

create or replace function public.sh_campaign_respond_invite(p_campaign_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_invite public.sh_campaign_direct_invites%rowtype;
begin
  if v_me is null or p_campaign_id is null or p_accept is null then
    raise exception 'Nieprawidlowe zaproszenie' using errcode='22023';
  end if;
  select * into v_invite from public.sh_campaign_direct_invites
    where campaign_id=p_campaign_id and receiver_id=v_me and status='pending' for update;
  if not found then
    raise exception 'Nie znaleziono oczekujacego zaproszenia' using errcode='22023';
  end if;
  if p_accept then
    if not exists (
      select 1 from public.sh_campaigns c
      where c.id=p_campaign_id and c.owner_id=v_invite.inviter_id
    ) or not private.sh_are_friends(v_invite.inviter_id,v_me) then
      raise exception 'Zaproszenie nie jest juz wazne' using errcode='42501';
    end if;
    delete from private.sh_campaign_removed_members
      where campaign_id=p_campaign_id and user_id=v_me;
    insert into public.sh_campaign_members(campaign_id,user_id,role)
      values (p_campaign_id,v_me,'player')
      on conflict (campaign_id,user_id) do nothing;
  end if;
  update public.sh_campaign_direct_invites set
    status=case when p_accept then 'accepted' else 'declined' end,
    responded_at=pg_catalog.now()
    where campaign_id=p_campaign_id and receiver_id=v_me;
  return p_accept;
end;
$$;

create or replace function public.sh_campaign_remove_member(p_campaign_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null or p_campaign_id is null or p_user_id is null
     or p_user_id=v_me or not private.sh_is_gm(p_campaign_id) then
    raise exception 'Tylko MG moze usuwac innych graczy' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.sh_campaign_members m
    where m.campaign_id=p_campaign_id and m.user_id=p_user_id and m.role='player'
  ) then
    raise exception 'Nie znaleziono gracza w tej kampanii' using errcode='22023';
  end if;
  insert into private.sh_campaign_removed_members(campaign_id,user_id,removed_by)
    values (p_campaign_id,p_user_id,v_me)
    on conflict(campaign_id,user_id) do update
      set removed_by=excluded.removed_by,removed_at=pg_catalog.now();
  delete from public.sh_campaign_members
    where campaign_id=p_campaign_id and user_id=p_user_id and role='player';
  -- Shared characters and their live state disappear via existing ON DELETE CASCADE.
  delete from public.sh_room_presence
    where campaign_id=p_campaign_id and user_id=p_user_id;
  update public.sh_campaign_direct_invites
    set status='revoked',responded_at=pg_catalog.now()
    where campaign_id=p_campaign_id and receiver_id=p_user_id;
end;
$$;

create or replace function public.sh_campaign_list_members(p_campaign_id uuid)
returns table(user_id uuid,display_name text,role text,joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.sh_is_member(p_campaign_id) then
    raise exception 'Brak dostepu do listy druzyny' using errcode='42501';
  end if;
  return query
    select m.user_id,
      coalesce(nullif(p.display_name,''),'Awanturnik')::text,
      m.role,m.joined_at
    from public.sh_campaign_members m
    left join public.sh_profiles p on p.id=m.user_id
    where m.campaign_id=p_campaign_id
    order by case when m.role='gm' then 0 else 1 end,m.joined_at;
end;
$$;

create or replace function public.sh_campaign_pending_invites()
returns table(campaign_id uuid,campaign_title text,inviter_name text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'Zaloguj sie, aby zobaczyc zaproszenia' using errcode='42501';
  end if;
  return query
    select i.campaign_id,c.title,
      coalesce(nullif(p.display_name,''),'Mistrz Gry')::text,
      i.created_at
    from public.sh_campaign_direct_invites i
    join public.sh_campaigns c on c.id=i.campaign_id
    left join public.sh_profiles p on p.id=i.inviter_id
    where i.receiver_id=v_me and i.status='pending'
      and not exists (
        select 1 from public.sh_campaign_members m
        where m.campaign_id=i.campaign_id and m.user_id=v_me
      )
    order by i.created_at desc limit 100;
end;
$$;

revoke all on function public.sh_campaign_invite_friend(uuid,uuid) from public,anon;
revoke all on function public.sh_campaign_respond_invite(uuid,boolean) from public,anon;
revoke all on function public.sh_campaign_remove_member(uuid,uuid) from public,anon;
revoke all on function public.sh_campaign_list_members(uuid) from public,anon;
revoke all on function public.sh_campaign_pending_invites() from public,anon;
grant execute on function public.sh_campaign_invite_friend(uuid,uuid) to authenticated;
grant execute on function public.sh_campaign_respond_invite(uuid,boolean) to authenticated;
grant execute on function public.sh_campaign_remove_member(uuid,uuid) to authenticated;
grant execute on function public.sh_campaign_list_members(uuid) to authenticated;
grant execute on function public.sh_campaign_pending_invites() to authenticated;

-- Keep the table visible via Realtime only to users who pass its SELECT RLS policy.
do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='sh_campaign_direct_invites'
  ) then
    execute 'alter publication supabase_realtime add table public.sh_campaign_direct_invites';
  end if;
end;
$$;