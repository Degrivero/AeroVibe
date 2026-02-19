-- Asegurar que delete_spot_comment existe con parámetros nombrados (actor_id, comment_id, is_moderator)
-- para que PostgREST/Supabase RPC lo encuentre al llamar desde el dashboard de reportes.
-- DROP primero porque PostgreSQL no permite cambiar nombres de parámetros con CREATE OR REPLACE.
drop function if exists public.delete_spot_comment(uuid, uuid, boolean);

create or replace function public.delete_spot_comment(
  actor_id uuid,
  comment_id uuid,
  is_moderator boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.spot_comments c
  where c.id = delete_spot_comment.comment_id
    and (
      c.user_id = delete_spot_comment.actor_id
      or delete_spot_comment.is_moderator
      or exists (
        select 1 from public.spots s
        where s.id = c.spot_id and s.created_by = delete_spot_comment.actor_id
      )
    );
end;
$$;
