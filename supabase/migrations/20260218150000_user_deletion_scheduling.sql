-- User deletion scheduling: campos para programar baja de cuenta
-- Los campos van en user_profiles (user_profiles.id = auth.users.id)

alter table public.user_profiles
  add column if not exists is_scheduled_for_deletion boolean not null default false,
  add column if not exists deletion_requested_at timestamptz null,
  add column if not exists scheduled_deletion_at timestamptz null;

comment on column public.user_profiles.is_scheduled_for_deletion is 'Usuario solicitó baja; será eliminado en scheduled_deletion_at.';
comment on column public.user_profiles.deletion_requested_at is 'Momento en que se solicitó la baja.';
comment on column public.user_profiles.scheduled_deletion_at is 'Fecha/hora de ejecución del borrado definitivo.';

create index if not exists user_profiles_scheduled_deletion_idx
  on public.user_profiles (scheduled_deletion_at)
  where is_scheduled_for_deletion = true and scheduled_deletion_at is not null;

-- Función auxiliar para obtener IDs de usuarios a eliminar (llamada por cron/edge function)
create or replace function public.get_users_scheduled_for_deletion()
returns setof uuid
language sql
stable
set search_path = public
as $$
  select id
  from public.user_profiles
  where is_scheduled_for_deletion = true
    and scheduled_deletion_at is not null
    and scheduled_deletion_at <= now();
$$;

-- Vista para dashboard admin: contar pendientes de borrado
create or replace view public.admin_users_scheduled_deletion_count
  with (security_invoker = true)
as
  select count(*)::int as count
  from public.user_profiles
  where is_scheduled_for_deletion = true
    and scheduled_deletion_at is not null
    and scheduled_deletion_at > now();
