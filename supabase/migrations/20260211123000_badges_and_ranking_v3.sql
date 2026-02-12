-- Badges + ranking v3

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  awarded_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  unique (user_id, badge_key)
);

create index if not exists user_badges_user_idx
  on public.user_badges (user_id, awarded_at desc);

create index if not exists user_badges_key_idx
  on public.user_badges (badge_key);

alter table public.user_badges enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_badges'
      and policyname = 'user_badges_select_own'
  ) then
    create policy user_badges_select_own
      on public.user_badges
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

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
    coalesce(b.badges_count, 0)::int as badges_count,
    (
      coalesce(s.public_spots_count, 0) * 25 +
      coalesce(s.favorites_received, 0) * 6 +
      coalesce(f.followers_count, 0) * 12 +
      coalesce(c.comments_count, 0) * 4 +
      coalesce(b.badges_count, 0) * 20
    )::int as points_total
  from public.user_profiles_public_view p
  left join followers f
    on f.user_id = p.id
  left join public_spots s
    on s.user_id = p.id
  left join comments_written c
    on c.user_id = p.id
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
