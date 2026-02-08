-- Hangar items (drones/aircraft)

create extension if not exists "pgcrypto";

create table if not exists public.hangar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  manufacturer text,
  model text,
  nickname text,
  serial text,
  weight_grams integer,
  max_flight_time_min integer,
  notes text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hangar_items_user_idx
  on public.hangar_items (user_id);

alter table public.hangar_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hangar_items' and policyname = 'hangar_select_own'
  ) then
    create policy hangar_select_own
      on public.hangar_items
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hangar_items' and policyname = 'hangar_insert_own'
  ) then
    create policy hangar_insert_own
      on public.hangar_items
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hangar_items' and policyname = 'hangar_update_own'
  ) then
    create policy hangar_update_own
      on public.hangar_items
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hangar_items' and policyname = 'hangar_delete_own'
  ) then
    create policy hangar_delete_own
      on public.hangar_items
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_hangar_items_updated_at on public.hangar_items;
    create trigger trg_hangar_items_updated_at
      before update on public.hangar_items
      for each row execute function public.set_updated_at();
  end if;
end $$;
