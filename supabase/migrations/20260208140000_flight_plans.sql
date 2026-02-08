-- Flight plans (agenda de vuelos)

create extension if not exists "pgcrypto";

create table if not exists public.flight_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  spot_id uuid,
  spot_title text,
  spot_lat double precision,
  spot_lng double precision,
  scheduled_at timestamptz not null,
  notes text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flight_plans_user_idx
  on public.flight_plans (user_id);
create index if not exists flight_plans_scheduled_idx
  on public.flight_plans (scheduled_at);

create table if not exists public.flight_plan_invites (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.flight_plans(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists flight_plan_invites_unique
  on public.flight_plan_invites (plan_id, user_id);
create index if not exists flight_plan_invites_user_idx
  on public.flight_plan_invites (user_id);

alter table public.flight_plans enable row level security;
alter table public.flight_plan_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plans' and policyname = 'flight_plans_select_owner_or_invited'
  ) then
    create policy flight_plans_select_owner_or_invited
      on public.flight_plans
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.flight_plan_invites i
          where i.plan_id = flight_plans.id and i.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plans' and policyname = 'flight_plans_insert_own'
  ) then
    create policy flight_plans_insert_own
      on public.flight_plans
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plans' and policyname = 'flight_plans_update_own'
  ) then
    create policy flight_plans_update_own
      on public.flight_plans
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plans' and policyname = 'flight_plans_delete_own'
  ) then
    create policy flight_plans_delete_own
      on public.flight_plans
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plan_invites' and policyname = 'flight_invites_select_owner_or_invitee'
  ) then
    create policy flight_invites_select_owner_or_invitee
      on public.flight_plan_invites
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1 from public.flight_plans p
          where p.id = flight_plan_invites.plan_id and p.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plan_invites' and policyname = 'flight_invites_insert_owner'
  ) then
    create policy flight_invites_insert_owner
      on public.flight_plan_invites
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.flight_plans p
          where p.id = flight_plan_invites.plan_id and p.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plan_invites' and policyname = 'flight_invites_update_invitee'
  ) then
    create policy flight_invites_update_invitee
      on public.flight_plan_invites
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'flight_plan_invites' and policyname = 'flight_invites_delete_owner'
  ) then
    create policy flight_invites_delete_owner
      on public.flight_plan_invites
      for delete
      to authenticated
      using (
        exists (
          select 1 from public.flight_plans p
          where p.id = flight_plan_invites.plan_id and p.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_flight_plans_updated_at on public.flight_plans;
    create trigger trg_flight_plans_updated_at
      before update on public.flight_plans
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_flight_invites_updated_at on public.flight_plan_invites;
    create trigger trg_flight_invites_updated_at
      before update on public.flight_plan_invites
      for each row execute function public.set_updated_at();
  end if;
end $$;
