create table if not exists private.sh_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','moderator')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default pg_catalog.now()
);
create table if not exists private.sh_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint sh_admin_audit_details_object check (pg_catalog.jsonb_typeof(details)='object')
);
create index if not exists sh_admin_audit_recent_idx on private.sh_admin_audit(created_at desc,id desc);
alter table private.sh_admin_roles enable row level security;
alter table private.sh_admin_audit enable row level security;
revoke all on private.sh_admin_roles from public,anon,authenticated;
revoke all on private.sh_admin_audit from public,anon,authenticated;
revoke all on sequence private.sh_admin_audit_id_seq from public,anon,authenticated;

create or replace function private.sh_admin_role()
returns text language sql stable security definer set search_path=''
as $fn$
  select ar.role from private.sh_admin_roles ar where ar.user_id=(select auth.uid()) limit 1
$fn$;
revoke all on function private.sh_admin_role() from public,anon,authenticated;

create or replace function public.sh_admin_access()
returns jsonb language sql stable security definer set search_path=''
as $fn$
  select pg_catalog.jsonb_build_object(
    'role',private.sh_admin_role(),
    'user_id',(select auth.uid())
  )
$fn$;

create or replace function public.sh_admin_metrics()
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
begin
  if (select auth.uid()) is null or private.sh_admin_role() is null then
    raise exception 'Administrator authentication required' using errcode='42501';
  end if;
  return pg_catalog.jsonb_build_object(
    'users',(select pg_catalog.count(*) from auth.users),
    'moderators',(select pg_catalog.count(*) from private.sh_admin_roles where role='moderator'),
    'campaigns',(select pg_catalog.count(*) from public.sh_campaigns),
    'active_campaigns',(select pg_catalog.count(*) from public.sh_campaigns where archived_at is null),
    'archived_campaigns',(select pg_catalog.count(*) from public.sh_campaigns where archived_at is not null),
    'characters',(select pg_catalog.count(*) from public.sh_characters),
    'events',(select pg_catalog.count(*) from public.sh_room_events),
    'direct_messages',(select pg_catalog.count(*) from public.sh_direct_messages)
  );
end
$fn$;

create or replace function public.sh_admin_users(
 p_query text default '',p_limit integer default 40,p_offset integer default 0
)
returns table(user_id uuid,display_name text,admin_role text,characters bigint,campaigns bigint,registered_at timestamptz)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 return query
 select u.id,coalesce(nullif(p.display_name,''),'Awanturnik')::text,ar.role::text,
    (select pg_catalog.count(*) from public.sh_characters ch where ch.owner_id=u.id),
    (select pg_catalog.count(*) from public.sh_campaigns c where c.owner_id=u.id),
    u.created_at
 from auth.users u
 left join public.sh_profiles p on p.id=u.id
 left join private.sh_admin_roles ar on ar.user_id=u.id
 where nullif(pg_catalog.btrim(p_query),'') is null
    or coalesce(p.display_name,'') ilike '%'||pg_catalog.btrim(p_query)||'%'
    or u.id::text ilike '%'||pg_catalog.btrim(p_query)||'%'
 order by u.created_at desc,u.id
 limit pg_catalog.greatest(1,pg_catalog.least(coalesce(p_limit,40),100))
 offset pg_catalog.greatest(coalesce(p_offset,0),0);
end
$fn$;

create or replace function public.sh_admin_campaigns(
 p_query text default '',p_status text default 'all',p_limit integer default 40,p_offset integer default 0
)
returns table(campaign_id uuid,title text,owner_id uuid,owner_name text,
  player_count bigint,character_count bigint,archived_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 if p_status not in ('all','active','archived') then
   raise exception 'Invalid campaign status' using errcode='22023';
 end if;
 return query
 select c.id,c.title,c.owner_id,
    coalesce(nullif(p.display_name,''),'Mistrz Gry')::text,
    (select pg_catalog.count(*) from public.sh_campaign_members m where m.campaign_id=c.id and m.role='player'),
    (select pg_catalog.count(*) from public.sh_campaign_characters cc where cc.campaign_id=c.id),
    c.archived_at,c.created_at
 from public.sh_campaigns c
 left join public.sh_profiles p on p.id=c.owner_id
 where (p_status='all' or (p_status='active' and c.archived_at is null)
        or (p_status='archived' and c.archived_at is not null))
   and (nullif(pg_catalog.btrim(p_query),'') is null
        or c.title ilike '%'||pg_catalog.btrim(p_query)||'%'
        or c.id::text ilike '%'||pg_catalog.btrim(p_query)||'%')
 order by c.created_at desc,c.id
 limit pg_catalog.greatest(1,pg_catalog.least(coalesce(p_limit,40),100))
 offset pg_catalog.greatest(coalesce(p_offset,0),0);
end
$fn$;

create or replace function public.sh_admin_members(p_campaign_id uuid)
returns table(user_id uuid,display_name text,member_role text,joined_at timestamptz)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 if p_campaign_id is null then raise exception 'Campaign required' using errcode='22023'; end if;
 return query
 select m.user_id,coalesce(nullif(p.display_name,''),'Awanturnik')::text,m.role::text,m.joined_at
 from public.sh_campaign_members m
 left join public.sh_profiles p on p.id=m.user_id
 where m.campaign_id=p_campaign_id
 order by case when m.role='gm' then 0 else 1 end,m.joined_at;
end
$fn$;

create or replace function public.sh_admin_activity(p_limit integer default 40)
returns table(id bigint,actor_id uuid,actor_name text,action text,subject_type text,subject_id uuid,details jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 return query
 select a.id,a.actor_id,coalesce(nullif(p.display_name,''),'Administrator')::text,
        a.action,a.subject_type,a.subject_id,a.details,a.created_at
 from private.sh_admin_audit a
 left join public.sh_profiles p on p.id=a.actor_id
 order by a.created_at desc,a.id desc
 limit pg_catalog.greatest(1,pg_catalog.least(coalesce(p_limit,40),100));
end
$fn$;

create or replace function public.sh_admin_archive_campaign(p_campaign_id uuid,p_archived boolean,p_reason text default '')
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());v_old timestamptz;v_changed boolean;
begin
 if v_actor is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 if p_campaign_id is null or p_archived is null then
   raise exception 'Campaign and action required' using errcode='22023';
 end if;
 if pg_catalog.char_length(pg_catalog.btrim(coalesce(p_reason,''))) < 5 then
   raise exception 'Give a reason (min 5 characters)' using errcode='22023';
 end if;
 select c.archived_at into v_old from public.sh_campaigns c where c.id=p_campaign_id for update;
 if not found then raise exception 'Campaign not found' using errcode='22023'; end if;
 v_changed:=(v_old is null) = p_archived;
 if not v_changed then return; end if;
 update public.sh_campaigns set archived_at=case when p_archived then pg_catalog.now() else null end
 where id=p_campaign_id;
 insert into private.sh_admin_audit(actor_id,action,subject_type,subject_id,details)
 values(v_actor,case when p_archived then 'campaign.archive' else 'campaign.restore' end,
        'campaign',p_campaign_id,pg_catalog.jsonb_build_object('reason',pg_catalog.left(pg_catalog.btrim(p_reason),250)));
end
$fn$;

create or replace function public.sh_admin_remove_player(p_campaign_id uuid,p_user_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or private.sh_admin_role() is null then
   raise exception 'Administrator authentication required' using errcode='42501';
 end if;
 if p_campaign_id is null or p_user_id is null or
    pg_catalog.char_length(pg_catalog.btrim(coalesce(p_reason,''))) < 5 then
   raise exception 'Campaign, player and reason (min 5 chars) required' using errcode='22023';
 end if;
 if not exists(select 1 from public.sh_campaign_members
   where campaign_id=p_campaign_id and user_id=p_user_id and role='player') then
   raise exception 'Player is not in the campaign' using errcode='22023';
 end if;
 insert into private.sh_campaign_removed_members(campaign_id,user_id,removed_by)
 values(p_campaign_id,p_user_id,v_actor)
 on conflict (campaign_id,user_id) do update
   set removed_by=excluded.removed_by,removed_at=pg_catalog.now();
 delete from public.sh_campaign_members where campaign_id=p_campaign_id and user_id=p_user_id and role='player';
 delete from public.sh_room_presence where campaign_id=p_campaign_id and user_id=p_user_id;
 update public.sh_campaign_direct_invites set status='revoked',responded_at=pg_catalog.now()
 where campaign_id=p_campaign_id and receiver_id=p_user_id and status='pending';
 insert into private.sh_admin_audit(actor_id,action,subject_type,subject_id,details)
 values(v_actor,'campaign.player_removed','user',p_user_id,
 pg_catalog.jsonb_build_object('campaign_id',p_campaign_id,'reason',pg_catalog.left(pg_catalog.btrim(p_reason),250)));
end
$fn$;

create or replace function public.sh_admin_set_moderator(p_user_id uuid,p_enabled boolean,p_reason text default '')
returns void language plpgsql security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid());v_old text;
begin
 if v_actor is null or private.sh_admin_role() is distinct from 'owner' then
    raise exception 'Only system owner may manage moderator roles' using errcode='42501';
 end if;
 if p_user_id is null or p_enabled is null or p_user_id=v_actor or
    pg_catalog.char_length(pg_catalog.btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Target other user and give a reason (min 5 chars)' using errcode='22023';
 end if;
 if not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'User not found' using errcode='22023';
 end if;
 select role into v_old from private.sh_admin_roles where user_id=p_user_id for update;
 if v_old='owner' then raise exception 'Owner roles cannot be changed via UI' using errcode='42501';end if;
 if p_enabled then
    insert into private.sh_admin_roles(user_id,role,assigned_by)
    values(p_user_id,'moderator',v_actor)
    on conflict(user_id) do update set role='moderator',assigned_by=v_actor,assigned_at=pg_catalog.now();
 else
    delete from private.sh_admin_roles where user_id=p_user_id and role='moderator';
 end if;
 if coalesce(v_old,'') is distinct from (case when p_enabled then 'moderator' else '' end) then
    insert into private.sh_admin_audit(actor_id,action,subject_type,subject_id,details)
    values(v_actor,case when p_enabled then 'moderator.grant' else 'moderator.revoke' end,
           'user',p_user_id,pg_catalog.jsonb_build_object('reason',pg_catalog.left(pg_catalog.btrim(p_reason),250)));
 end if;
end
$fn$;

revoke all on function public.sh_admin_access() from public,anon,authenticated;
revoke all on function public.sh_admin_metrics() from public,anon,authenticated;
revoke all on function public.sh_admin_users(text,integer,integer) from public,anon,authenticated;
revoke all on function public.sh_admin_campaigns(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.sh_admin_members(uuid) from public,anon,authenticated;
revoke all on function public.sh_admin_activity(integer) from public,anon,authenticated;
revoke all on function public.sh_admin_archive_campaign(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.sh_admin_remove_player(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.sh_admin_set_moderator(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.sh_admin_access() to authenticated;
grant execute on function public.sh_admin_metrics() to authenticated;
grant execute on function public.sh_admin_users(text,integer,integer) to authenticated;
grant execute on function public.sh_admin_campaigns(text,text,integer,integer) to authenticated;
grant execute on function public.sh_admin_members(uuid) to authenticated;
grant execute on function public.sh_admin_activity(integer) to authenticated;
grant execute on function public.sh_admin_archive_campaign(uuid,boolean,text) to authenticated;
grant execute on function public.sh_admin_remove_player(uuid,uuid,text) to authenticated;
grant execute on function public.sh_admin_set_moderator(uuid,boolean,text) to authenticated;
