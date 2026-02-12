-- Spot ratings (1..5 drones)

create table if not exists public.spot_ratings (
  spot_id uuid not null references public.spots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

alter table public.spot_ratings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists spot_ratings_spot_idx
  on public.spot_ratings (spot_id);

create index if not exists spot_ratings_user_idx
  on public.spot_ratings (user_id);

alter table public.spot_ratings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_ratings'
      and policyname = 'spot_ratings_select_public'
  ) then
    create policy spot_ratings_select_public
      on public.spot_ratings
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_ratings'
      and policyname = 'spot_ratings_insert_own'
  ) then
    create policy spot_ratings_insert_own
      on public.spot_ratings
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_ratings'
      and policyname = 'spot_ratings_update_own'
  ) then
    create policy spot_ratings_update_own
      on public.spot_ratings
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spot_ratings'
      and policyname = 'spot_ratings_delete_own'
  ) then
    create policy spot_ratings_delete_own
      on public.spot_ratings
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_spot_ratings_updated_at on public.spot_ratings;
    create trigger trg_spot_ratings_updated_at
      before update on public.spot_ratings
      for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.get_spot_rating_summary(
  spot_id_input uuid,
  current_user_id uuid default null
)
returns jsonb
language sql
stable
set search_path = public, extensions
as $function$
  with agg as (
    select
      coalesce(round(avg(sr.rating)::numeric, 2), 0) as rating_avg,
      count(*)::int as rating_count
    from public.spot_ratings sr
    where sr.spot_id = spot_id_input
  ),
  mine as (
    select sr.rating
    from public.spot_ratings sr
    where sr.spot_id = spot_id_input
      and current_user_id is not null
      and sr.user_id = current_user_id
    limit 1
  )
  select jsonb_build_object(
    'rating_avg', agg.rating_avg,
    'rating_count', agg.rating_count,
    'my_rating', (select rating from mine)
  )
  from agg;
$function$;

create or replace function public.set_spot_rating(
  spot_id_input uuid,
  current_user_id uuid,
  rating_input integer
)
returns jsonb
language plpgsql
set search_path = public, extensions
as $function$
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if rating_input is null or rating_input < 1 or rating_input > 5 then
    raise exception 'invalid_rating';
  end if;

  if not exists (select 1 from public.spots s where s.id = spot_id_input) then
    raise exception 'spot_not_found';
  end if;

  insert into public.spot_ratings (spot_id, user_id, rating)
  values (spot_id_input, current_user_id, rating_input)
  on conflict (spot_id, user_id)
  do update
    set rating = excluded.rating,
        updated_at = now();

  return public.get_spot_rating_summary(spot_id_input, current_user_id);
end;
$function$;
