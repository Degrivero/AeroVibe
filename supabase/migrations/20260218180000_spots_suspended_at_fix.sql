-- Ensure spots.suspended_at exists (required for "Ocultar contenido" in report moderation)
alter table public.spots
  add column if not exists suspended_at timestamptz null;

comment on column public.spots.suspended_at is 'Si no es null, el spot está suspendido por moderación y no se muestra en listados públicos.';
