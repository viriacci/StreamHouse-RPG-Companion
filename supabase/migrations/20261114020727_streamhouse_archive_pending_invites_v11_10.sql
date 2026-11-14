CREATE OR REPLACE FUNCTION public.sh_campaign_pending_invites()
 RETURNS TABLE(campaign_id uuid, campaign_title text, inviter_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    where i.receiver_id=v_me and i.status='pending' and c.archived_at is null
      and not exists (
        select 1 from public.sh_campaign_members m
        where m.campaign_id=i.campaign_id and m.user_id=v_me
      )
    order by i.created_at desc limit 100;
end;
$function$
