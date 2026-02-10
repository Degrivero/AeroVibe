-- Ranking helpers (pilots)

create extension if not exists "pgcrypto";

-- Speed up correlated counts
create index if not exists user_relationships_to_type_idx
  on public.user_relationships (to_user_id, type);

create index if not exists spots_created_by_visibility_idx
  on public.spots (created_by, visibility);

-- Public pilot ranking (used by api-service with service role)
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
  favorites_received integer
)
language sql
stable
as $$
  select
    p.id,
    p.nickname,
    p.avatar_url,
    p.country,
    p.city,

    (select count(*)::int
     from public.user_relationships r
     where r.to_user_id = p.id
       and r.type = 'follow'
    ) as followers_count,

    (select count(*)::int
     from public.spots s
     where s.created_by = p.id
       and s.visibility = 'public'
    ) as public_spots_count,

    (select coalesce(sum(s2.favorites_count), 0)::int
     from public.spots s2
     where s2.created_by = p.id
       and s2.visibility = 'public'
    ) as favorites_received

  from public.user_profiles_public_view p
  where (country_filter is null or p.country = country_filter)
    and (city_filter is null or p.city = city_filter)
  order by followers_count desc, favorites_received desc, public_spots_count desc
  limit greatest(coalesce(limit_count, 50), 1);
$$;
