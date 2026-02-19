-- Tabla user_relationships para follow (referenciada en security_hardening y ranking).
-- type es text con check para evitar enums que impidan otros backends; nuestro api-service solo usa 'follow'.
create table if not exists public.user_relationships (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'follow' check (type in ('follow')),
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id, type)
);

create index if not exists user_relationships_from_idx on public.user_relationships (from_user_id);
create index if not exists user_relationships_to_type_idx on public.user_relationships (to_user_id, type);
