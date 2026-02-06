-- Security hardening for Supabase (RLS + views + search_path + app_metadata roles)

-- 1) Attempt to move PostGIS out of public (Supabase may block this)
create schema if not exists extensions;
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'postgis' and n.nspname = 'public'
  ) then
    begin
      alter extension postgis set schema extensions;
    exception when others then
      raise notice 'Skipping moving postgis: %', sqlerrm;
    end;
  end if;
end $$;

-- 2) Recreate public views without SECURITY DEFINER
create or replace view public.user_profiles_public_view
  with (security_invoker = true)
as
select
  id,
  nickname,
  first_name,
  last_name,
  avatar_url,
  country,
  city,
  bio,
  created_at,
  updated_at
from public.user_profiles;

create or replace view public.spots_public_view
  with (security_invoker = true)
as
select
  s.id,
  s.title,
  s.description,
  s.lat,
  s.lng,
  s.created_by,
  s.created_at,
  s.favorites_count,
  s.views_count,
  s.flights_count,
  s.comments_count,
  p.nickname as creator_nickname,
  p.first_name as creator_first_name,
  p.last_name as creator_last_name,
  p.avatar_url as creator_avatar,
  p.country as creator_country,
  p.city as creator_city
from public.spots s
left join public.user_profiles_public_view p on p.id = s.created_by;

create or replace view public.spots_admin_view
  with (security_invoker = true)
as
select
  id,
  title as name,
  description,
  lat,
  lng,
  created_by,
  created_at
from public.spots;

-- 3) Helper function for admin checks (app_metadata.role)
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- 4) Enable RLS on public tables
alter table public.spot_comments enable row level security;
alter table public.offline_spot_downloads enable row level security;
alter table public.user_relationships enable row level security;
alter table public.spot_comment_creator_likes enable row level security;
alter table public.spot_media enable row level security;
alter table public.spot_copilots enable row level security;
alter table public.spot_favorites enable row level security;
alter table public.spots enable row level security;
alter table public.user_profiles enable row level security;

-- 5) Reset duplicate policies on spots and user_profiles
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'spots'
  loop
    execute format('drop policy if exists %I on public.spots', r.policyname);
  end loop;

  for r in
    select policyname from pg_policies where schemaname = 'public' and tablename = 'user_profiles'
  loop
    execute format('drop policy if exists %I on public.user_profiles', r.policyname);
  end loop;
end $$;

-- 6) Spots policies (mixed: public read, auth write)
create policy spots_select_public
  on public.spots
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    or created_by = auth.uid()
    or public.is_admin()
  );

create policy spots_insert_owner
  on public.spots
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy spots_update_owner_or_admin
  on public.spots
  for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy spots_delete_owner_or_admin
  on public.spots
  for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- 7) User profiles policies (private to owner)
create policy user_profiles_select_own
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy user_profiles_insert_own
  on public.user_profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy user_profiles_update_own
  on public.user_profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 8) Spot media policies
drop policy if exists spot_media_select_public on public.spot_media;
drop policy if exists spot_media_insert_owner on public.spot_media;
drop policy if exists spot_media_update_owner on public.spot_media;
drop policy if exists spot_media_delete_owner on public.spot_media;

create policy spot_media_select_public
  on public.spot_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.spots s
      where s.id = spot_media.spot_id
        and (s.visibility = 'public' or s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_media_insert_owner
  on public.spot_media
  for insert
  to authenticated
  with check (
    (spot_media.user_id = auth.uid())
    and exists (
      select 1 from public.spots s
      where s.id = spot_media.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_media_update_owner
  on public.spot_media
  for update
  to authenticated
  using (
    exists (
      select 1 from public.spots s
      where s.id = spot_media.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.spots s
      where s.id = spot_media.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_media_delete_owner
  on public.spot_media
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.spots s
      where s.id = spot_media.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

-- 9) Spot comments policies
drop policy if exists spot_comments_select_public on public.spot_comments;
drop policy if exists spot_comments_insert_auth on public.spot_comments;
drop policy if exists spot_comments_update_own on public.spot_comments;
drop policy if exists spot_comments_delete_own_or_owner on public.spot_comments;

create policy spot_comments_select_public
  on public.spot_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.spots s
      where s.id = spot_comments.spot_id
        and (s.visibility = 'public' or s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_comments_insert_auth
  on public.spot_comments
  for insert
  to authenticated
  with check (
    spot_comments.user_id = auth.uid()
    and exists (
      select 1 from public.spots s
      where s.id = spot_comments.spot_id
        and s.visibility = 'public'
    )
  );

create policy spot_comments_update_own
  on public.spot_comments
  for update
  to authenticated
  using (spot_comments.user_id = auth.uid() or public.is_admin())
  with check (spot_comments.user_id = auth.uid() or public.is_admin());

create policy spot_comments_delete_own_or_owner
  on public.spot_comments
  for delete
  to authenticated
  using (
    spot_comments.user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.spots s
      where s.id = spot_comments.spot_id
        and s.created_by = auth.uid()
    )
  );

-- 10) Spot comment creator likes policies
drop policy if exists spot_comment_creator_likes_select_owner on public.spot_comment_creator_likes;
drop policy if exists spot_comment_creator_likes_insert_owner on public.spot_comment_creator_likes;
drop policy if exists spot_comment_creator_likes_delete_owner on public.spot_comment_creator_likes;

create policy spot_comment_creator_likes_select_owner
  on public.spot_comment_creator_likes
  for select
  to authenticated
  using (spot_comment_creator_likes.creator_id = auth.uid() or public.is_admin());

create policy spot_comment_creator_likes_insert_owner
  on public.spot_comment_creator_likes
  for insert
  to authenticated
  with check (spot_comment_creator_likes.creator_id = auth.uid() or public.is_admin());

create policy spot_comment_creator_likes_delete_owner
  on public.spot_comment_creator_likes
  for delete
  to authenticated
  using (spot_comment_creator_likes.creator_id = auth.uid() or public.is_admin());

-- 11) Spot favorites policies
drop policy if exists spot_favorites_select_own on public.spot_favorites;
drop policy if exists spot_favorites_insert_own on public.spot_favorites;
drop policy if exists spot_favorites_delete_own on public.spot_favorites;

create policy spot_favorites_select_own
  on public.spot_favorites
  for select
  to authenticated
  using (spot_favorites.user_id = auth.uid());

create policy spot_favorites_insert_own
  on public.spot_favorites
  for insert
  to authenticated
  with check (spot_favorites.user_id = auth.uid());

create policy spot_favorites_delete_own
  on public.spot_favorites
  for delete
  to authenticated
  using (spot_favorites.user_id = auth.uid());

-- 12) Spot copilots policies
drop policy if exists spot_copilots_select_public on public.spot_copilots;
drop policy if exists spot_copilots_insert_owner on public.spot_copilots;
drop policy if exists spot_copilots_delete_owner_or_self on public.spot_copilots;

create policy spot_copilots_select_public
  on public.spot_copilots
  for select
  to anon, authenticated
  using (
    (
      spot_copilots.accepted = true
      and exists (
        select 1 from public.spots s
        where s.id = spot_copilots.spot_id
          and s.visibility = 'public'
      )
    )
    or spot_copilots.user_id = auth.uid()
    or exists (
      select 1 from public.spots s
      where s.id = spot_copilots.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_copilots_insert_owner
  on public.spot_copilots
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.spots s
      where s.id = spot_copilots.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

create policy spot_copilots_delete_owner_or_self
  on public.spot_copilots
  for delete
  to authenticated
  using (
    spot_copilots.user_id = auth.uid()
    or exists (
      select 1 from public.spots s
      where s.id = spot_copilots.spot_id
        and (s.created_by = auth.uid() or public.is_admin())
    )
  );

-- 13) User relationships policies
drop policy if exists user_relationships_select_own on public.user_relationships;
drop policy if exists user_relationships_insert_own on public.user_relationships;
drop policy if exists user_relationships_delete_own on public.user_relationships;

create policy user_relationships_select_own
  on public.user_relationships
  for select
  to authenticated
  using (
    user_relationships.from_user_id = auth.uid()
    or user_relationships.to_user_id = auth.uid()
  );

create policy user_relationships_insert_own
  on public.user_relationships
  for insert
  to authenticated
  with check (user_relationships.from_user_id = auth.uid());

create policy user_relationships_delete_own
  on public.user_relationships
  for delete
  to authenticated
  using (user_relationships.from_user_id = auth.uid());

-- 14) Offline downloads policies
drop policy if exists offline_spot_downloads_select_own on public.offline_spot_downloads;
drop policy if exists offline_spot_downloads_insert_own on public.offline_spot_downloads;
drop policy if exists offline_spot_downloads_delete_own on public.offline_spot_downloads;

create policy offline_spot_downloads_select_own
  on public.offline_spot_downloads
  for select
  to authenticated
  using (offline_spot_downloads.user_id = auth.uid());

create policy offline_spot_downloads_insert_own
  on public.offline_spot_downloads
  for insert
  to authenticated
  with check (offline_spot_downloads.user_id = auth.uid());

create policy offline_spot_downloads_delete_own
  on public.offline_spot_downloads
  for delete
  to authenticated
  using (offline_spot_downloads.user_id = auth.uid());

-- 14b) spatial_ref_sys policies (keep readable for PostGIS usage)
-- NOTE: spatial_ref_sys is owned by PostGIS and can't be altered in Supabase managed.
-- The linter error for spatial_ref_sys must be accepted; moving PostGIS out of public is blocked.

-- 15) Backfill app_metadata.role from user_metadata.role (one-time)
update auth.users
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  raw_user_meta_data->'role',
  true
)
where raw_user_meta_data ? 'role';

-- 16) Lock down function search_path
alter function public.add_spot_comment(uuid, uuid, text) set search_path = public, extensions;
alter function public.add_spot_comment(uuid, uuid, text, uuid) set search_path = public, extensions;
alter function public.add_spot_copilot(uuid, uuid, uuid) set search_path = public, extensions;
alter function public.decrement_spot_favorite(uuid) set search_path = public, extensions;
alter function public.delete_spot_comment(uuid, uuid, boolean) set search_path = public, extensions;
alter function public.get_public_spots(uuid, text, text, integer, integer) set search_path = public, extensions;
alter function public.get_spot_comments(uuid, integer, integer) set search_path = public, extensions;
alter function public.get_spot_detail(uuid, uuid) set search_path = public, extensions;
alter function public.get_user_copilots(uuid) set search_path = public, extensions;
alter function public.increment_spot_favorite(uuid) set search_path = public, extensions;
alter function public.increment_spot_view(uuid, text, integer) set search_path = public, extensions;
alter function public.prevent_created_by_change() set search_path = public, extensions;
alter function public.recompute_spot_media_summary(uuid) set search_path = public, extensions;
alter function public.remove_spot_copilot(uuid, uuid, uuid) set search_path = public, extensions;
alter function public.set_creator_like_comment(uuid, uuid, boolean) set search_path = public, extensions;
alter function public.set_updated_at() set search_path = public, extensions;
alter function public.spot_comments_count_down() set search_path = public, extensions;
alter function public.spot_comments_count_up() set search_path = public, extensions;
alter function public.spots_near(double precision, double precision, double precision) set search_path = public, extensions;
alter function public.sync_spot_media_summary() set search_path = public, extensions;
alter function public.sync_spot_media_summary_for(uuid) set search_path = public, extensions;
alter function public.trg_spot_media_summary_fn() set search_path = public, extensions;
alter function public.trg_spot_media_sync_spots() set search_path = public, extensions;
