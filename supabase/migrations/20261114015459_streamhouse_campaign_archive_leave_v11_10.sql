alter table public.sh_campaigns add column if not exists archived_at timestamptz;
create index if not exists sh_campaigns_owner_archive_idx on public.sh_campaigns(owner_id,archived_at,created_at desc);
create or replace function public.sh_campaign_set_archived(p_campaign_id uuid,p_archived boolean)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v_result timestamptz;
begin
  if (select auth.uid()) is null or p_campaign_id is null or p_archived is null
     or not private.sh_is_gm(p_campaign_id) then
    raise exception 'Tylko MG moze archiwizowac lub przywracac kampanie' using errcode='42501';
  end if;
  update public.sh_campaigns
    set archived_at=case when p_archived then coalesce(archived_at,pg_catalog.now()) else null end
    where id=p_campaign_id
    returning archived_at into v_result;
  if not found then raise exception 'Kampania nie istnieje' using errcode='22023'; end if;
  return v_result;
end;
$$;
create or replace function public.sh_campaign_leave(p_campaign_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_me uuid:=(select auth.uid());
begin
  if v_me is null or p_campaign_id is null then
    raise exception 'Zaloguj sie do kampanii' using errcode='42501';
  end if;
  if exists(select 1 from public.sh_campaigns c where c.id=p_campaign_id and c.owner_id=v_me) then
    raise exception 'MG nie moze porzucic swojej kampanii. Mozesz ja zarchiwizowac.' using errcode='42501';
  end if;
  delete from public.sh_campaign_members m
    where m.campaign_id=p_campaign_id and m.user_id=v_me and m.role='player';
  if not found then raise exception 'Nie nalezysz do tej kampanii' using errcode='22023';end if;
  delete from public.sh_room_presence where campaign_id=p_campaign_id and user_id=v_me;
  update public.sh_campaign_direct_invites set status='revoked',responded_at=pg_catalog.now()
    where campaign_id=p_campaign_id and receiver_id=v_me and status in ('pending','accepted');
end;
$$;
create or replace function private.sh_prevent_removed_campaign_member()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists (select 1 from public.sh_campaigns c where c.id=new.campaign_id and c.archived_at is not null) then
    raise exception 'Nie mozna dolaczyc do zarchiwizowanej kampanii' using errcode='42501';
  end if;
  if exists (select 1 from private.sh_campaign_removed_members r
    where r.campaign_id=new.campaign_id and r.user_id=new.user_id) then
    raise exception 'Aby ponownie dolaczyc, popros MG o nowe zaproszenie osobiste' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.sh_campaign_set_archived(uuid,boolean) from public,anon;
revoke all on function public.sh_campaign_leave(uuid) from public,anon;
grant execute on function public.sh_campaign_set_archived(uuid,boolean) to authenticated;
grant execute on function public.sh_campaign_leave(uuid) to authenticated;