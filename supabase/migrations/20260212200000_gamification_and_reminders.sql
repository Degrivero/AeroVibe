-- Gamificación v4 + recordatorios de planes de vuelo

create table if not exists public.spot_share_events (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists spot_share_events_spot_idx
  on public.spot_share_events (spot_id, created_at desc);

create index if not exists spot_share_events_user_idx
  on public.spot_share_events (user_id, created_at desc);

alter table public.spot_share_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_share_events'
      and policyname = 'spot_share_events_insert_own'
  ) then
    create policy spot_share_events_insert_own
      on public.spot_share_events
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_share_events'
      and policyname = 'spot_share_events_select_own'
  ) then
    create policy spot_share_events_select_own
      on public.spot_share_events
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.flight_plan_reminders (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flight_plans(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (
    reminder_type in ('day_before', 'same_day', 'post_flight_prompt')
  ),
  created_at timestamptz not null default now(),
  unique (plan_id, recipient_id, reminder_type)
);

create index if not exists flight_plan_reminders_recipient_idx
  on public.flight_plan_reminders (recipient_id, created_at desc);

drop function if exists public.get_pilot_ranking(integer, text, text);

create or replace function public.get_pilot_ranking(
  limit_count integer default 50,
  country_filter text default null,
  city_filter text default null
)
returns table(
  id uuid,
  nickname text,
  avatar_url text,
  country text,
  city text,
  followers_count integer,
  public_spots_count integer,
  favorites_received integer,
  comments_count integer,
  replies_count integer,
  shares_received integer,
  completed_flight_plans integer,
  copilots_count integer,
  hangar_items_count integer,
  badges_count integer,
  points_total integer
)
language sql
stable
as $$
  with followers as (
    select
      r.to_user_id as user_id,
      count(*)::int as followers_count
    from public.user_relationships r
    where r.type = 'follow'
    group by r.to_user_id
  ),
  public_spots as (
    select
      s.created_by as user_id,
      count(*)::int as public_spots_count,
      coalesce(sum(s.favorites_count), 0)::int as favorites_received
    from public.spots s
    where s.visibility = 'public'
    group by s.created_by
  ),
  comments_written as (
    select
      c.user_id,
      count(*)::int as comments_count
    from public.spot_comments c
    group by c.user_id
  ),
  replies_written as (
    select
      c.user_id,
      count(*)::int as replies_count
    from public.spot_comments c
    where c.parent_id is not null
    group by c.user_id
  ),
  spot_shares as (
    select
      s.created_by as user_id,
      count(se.id)::int as shares_received
    from public.spot_share_events se
    join public.spots s
      on s.id = se.spot_id
    group by s.created_by
  ),
  completed_plans as (
    select
      fp.user_id,
      count(*)::int as completed_flight_plans
    from public.flight_plans fp
    where lower(fp.status) in ('completed', 'done')
    group by fp.user_id
  ),
  mutual_copilots as (
    select
      r.from_user_id as user_id,
      count(*)::int as copilots_count
    from public.user_relationships r
    join public.user_relationships r2
      on r.to_user_id = r2.from_user_id
     and r.from_user_id = r2.to_user_id
    where r.type = 'follow'
      and r2.type = 'follow'
    group by r.from_user_id
  ),
  hangar as (
    select
      h.user_id,
      count(*)::int as hangar_items_count
    from public.hangar_items h
    group by h.user_id
  ),
  badges as (
    select
      b.user_id,
      count(*)::int as badges_count
    from public.user_badges b
    group by b.user_id
  )
  select
    p.id,
    p.nickname,
    p.avatar_url,
    p.country,
    p.city,
    coalesce(f.followers_count, 0)::int as followers_count,
    coalesce(s.public_spots_count, 0)::int as public_spots_count,
    coalesce(s.favorites_received, 0)::int as favorites_received,
    coalesce(c.comments_count, 0)::int as comments_count,
    coalesce(rw.replies_count, 0)::int as replies_count,
    coalesce(ss.shares_received, 0)::int as shares_received,
    coalesce(cp.completed_flight_plans, 0)::int as completed_flight_plans,
    coalesce(mc.copilots_count, 0)::int as copilots_count,
    coalesce(h.hangar_items_count, 0)::int as hangar_items_count,
    coalesce(b.badges_count, 0)::int as badges_count,
    (
      coalesce(s.public_spots_count, 0) * 30 +
      coalesce(c.comments_count, 0) * 4 +
      coalesce(rw.replies_count, 0) * 6 +
      coalesce(s.favorites_received, 0) * 3 +
      coalesce(ss.shares_received, 0) * 8 +
      coalesce(cp.completed_flight_plans, 0) * 20 +
      coalesce(f.followers_count, 0) * 10 +
      coalesce(mc.copilots_count, 0) * 12 +
      coalesce(h.hangar_items_count, 0) * 2 +
      coalesce(b.badges_count, 0) * 25
    )::int as points_total
  from public.user_profiles_public_view p
  left join followers f
    on f.user_id = p.id
  left join public_spots s
    on s.user_id = p.id
  left join comments_written c
    on c.user_id = p.id
  left join replies_written rw
    on rw.user_id = p.id
  left join spot_shares ss
    on ss.user_id = p.id
  left join completed_plans cp
    on cp.user_id = p.id
  left join mutual_copilots mc
    on mc.user_id = p.id
  left join hangar h
    on h.user_id = p.id
  left join badges b
    on b.user_id = p.id
  where (country_filter is null or p.country = country_filter)
    and (city_filter is null or p.city = city_filter)
  order by
    points_total desc,
    coalesce(f.followers_count, 0) desc,
    coalesce(s.favorites_received, 0) desc,
    coalesce(s.public_spots_count, 0) desc
  limit greatest(coalesce(limit_count, 50), 1);
$$;
