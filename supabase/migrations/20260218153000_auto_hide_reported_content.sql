-- Auto-ocultar contenido reportado 3+ veces
-- spot_comments: añadir suspended_at
alter table public.spot_comments
  add column if not exists suspended_at timestamptz null;

comment on column public.spot_comments.suspended_at is 'Si no es null, el comentario está oculto por 3+ reportes.';

-- Función: si (reported_type, reported_id) tiene 3+ reportes distintos, suspender
create or replace function public.auto_suspend_if_reported_3_times()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_type text;
  v_id uuid;
begin
  v_type := coalesce(NEW.reported_type, OLD.reported_type);
  v_id := coalesce(NEW.reported_id, OLD.reported_id);
  if v_type is null or v_id is null then
    return coalesce(NEW, OLD);
  end if;

  select count(distinct reporter_user_id)::int into v_count
  from public.user_reports
  where reported_type = v_type
    and reported_id = v_id;

  if v_count >= 3 then
    if v_type = 'spot' then
      update public.spots
      set suspended_at = now()
      where id = v_id and suspended_at is null;
    elsif v_type = 'comment' then
      update public.spot_comments
      set suspended_at = now()
      where id = v_id and suspended_at is null;
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

-- Trigger: tras insert o update de user_reports
drop trigger if exists trg_auto_suspend_on_report on public.user_reports;
create trigger trg_auto_suspend_on_report
  after insert or update of reported_type, reported_id
  on public.user_reports
  for each row
  execute function public.auto_suspend_if_reported_3_times();
