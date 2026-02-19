-- Reports v2: align fields and statuses

alter table public.user_reports
  rename column reporter_id to reporter_user_id;

alter table public.user_reports
  rename column entity_type to reported_type;

alter table public.user_reports
  rename column entity_id to reported_id;

alter table public.user_reports
  rename column reason_text to description;

alter table public.user_reports
  drop constraint if exists user_reports_entity_type_check;

alter table public.user_reports
  add constraint user_reports_reported_type_check
    check (reported_type in ('spot', 'comment'));

alter table public.user_reports
  drop constraint if exists user_reports_status_check;

alter table public.user_reports
  add constraint user_reports_status_check
    check (status in ('pending', 'reviewed', 'dismissed', 'action_taken'));

update public.user_reports
set status = case
  when status = 'confirmed' then 'reviewed'
  when status = 'dismissed' then 'dismissed'
  else 'pending'
end
where status in ('confirmed', 'dismissed', 'pending');

drop policy if exists user_reports_select_own on public.user_reports;
create policy user_reports_select_own
  on public.user_reports
  for select
  to authenticated
  using (
    reporter_user_id = auth.uid()
    or reported_user_id = auth.uid()
  );

drop policy if exists user_reports_insert_reporter on public.user_reports;
create policy user_reports_insert_reporter
  on public.user_reports
  for insert
  to authenticated
  with check (reporter_user_id = auth.uid());
