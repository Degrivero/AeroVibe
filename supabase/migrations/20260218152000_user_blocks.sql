-- User blocks: bloqueo usuario a usuario (A bloquea a B, A puede desbloquear)
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Usuario ve solo los bloques que él ha hecho
create policy user_blocks_select_own
  on public.user_blocks for select to authenticated
  using (blocker_id = auth.uid());

-- Usuario puede bloquear (insert)
create policy user_blocks_insert_own
  on public.user_blocks for insert to authenticated
  with check (blocker_id = auth.uid());

-- Usuario puede desbloquear (delete)
create policy user_blocks_delete_own
  on public.user_blocks for delete to authenticated
  using (blocker_id = auth.uid());
