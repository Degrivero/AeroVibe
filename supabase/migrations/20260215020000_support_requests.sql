-- Support requests (web contact form)

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  source text not null default 'web',
  name text not null,
  app_username text,
  email text not null,
  reason text not null,
  message text not null,

  ip inet,
  user_agent text,

  status text not null default 'open',
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  resolution_note text
);

create index if not exists support_requests_created_at_idx on public.support_requests(created_at desc);
create index if not exists support_requests_status_idx on public.support_requests(status);

alter table public.support_requests enable row level security;

-- Deny client access by default. API/service_role is the intended access path.
revoke all on table public.support_requests from anon, authenticated;

