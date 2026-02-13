-- Canonicaliza la insignia legacy "wingman" al badge oficial "copilots_1".
-- Evita duplicidades visuales y doble conteo de insignias.

insert into public.user_badges (user_id, badge_key, awarded_at, meta)
select
  w.user_id,
  'copilots_1' as badge_key,
  w.awarded_at,
  coalesce(w.meta, '{}'::jsonb) || jsonb_build_object('legacy_badge_key', 'wingman')
from public.user_badges w
left join public.user_badges c
  on c.user_id = w.user_id
 and c.badge_key = 'copilots_1'
where w.badge_key = 'wingman'
  and c.id is null;

delete from public.user_badges
where badge_key = 'wingman';
