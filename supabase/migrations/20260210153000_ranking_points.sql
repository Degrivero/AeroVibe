-- Ranking v2: points system for pilots

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
    (
      coalesce(s.public_spots_count, 0) * 25 +
      coalesce(s.favorites_received, 0) * 6 +
      coalesce(f.followers_count, 0) * 12 +
      coalesce(c.comments_count, 0) * 4
    )::int as points_total
  from public.user_profiles_public_view p
  left join followers f
    on f.user_id = p.id
  left join public_spots s
    on s.user_id = p.id
  left join comments_written c
    on c.user_id = p.id
  where (country_filter is null or p.country = country_filter)
    and (city_filter is null or p.city = city_filter)
  order by
    points_total desc,
    coalesce(f.followers_count, 0) desc,
    coalesce(s.favorites_received, 0) desc,
    coalesce(s.public_spots_count, 0) desc
  limit greatest(coalesce(limit_count, 50), 1);
$$;
