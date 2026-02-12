-- Marketplace base tables

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null default 'community' check (section in ('merch', 'community')),
  title text not null,
  description text null,
  price numeric(12, 2) null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'sold')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_listings_user_idx
  on public.marketplace_listings (user_id, created_at desc);

create index if not exists marketplace_listings_active_idx
  on public.marketplace_listings (is_active, status, created_at desc);

alter table public.marketplace_listings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'marketplace_listings'
      and policyname = 'marketplace_select_public_or_owner'
  ) then
    create policy marketplace_select_public_or_owner
      on public.marketplace_listings
      for select
      to anon, authenticated
      using (
        (is_active = true and status = 'approved')
        or user_id = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'marketplace_listings'
      and policyname = 'marketplace_insert_own'
  ) then
    create policy marketplace_insert_own
      on public.marketplace_listings
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'marketplace_listings'
      and policyname = 'marketplace_update_own'
  ) then
    create policy marketplace_update_own
      on public.marketplace_listings
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'marketplace_listings'
      and policyname = 'marketplace_delete_own'
  ) then
    create policy marketplace_delete_own
      on public.marketplace_listings
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_marketplace_listings_updated_at on public.marketplace_listings;
    create trigger trg_marketplace_listings_updated_at
      before update on public.marketplace_listings
      for each row execute function public.set_updated_at();
  end if;
end $$;
