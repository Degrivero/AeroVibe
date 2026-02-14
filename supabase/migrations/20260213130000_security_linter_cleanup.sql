-- Security/linter cleanup
-- - Ensure internal tables aren't accidentally exposed via PostgREST
-- - Lock down function search_path to avoid mutable search_path warnings

-- 1) Internal reminders table (used for idempotency) should not be exposed.
-- Enabling RLS with no policies denies all access for anon/authenticated by default.
alter table if exists public.flight_plan_reminders enable row level security;

-- 2) Avoid mutable search_path on ranking RPC.
alter function public.get_pilot_ranking(integer, text, text)
  set search_path = public, extensions;
