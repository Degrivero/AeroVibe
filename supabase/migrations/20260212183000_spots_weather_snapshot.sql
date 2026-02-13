-- Spots: persist weather snapshot at creation time

alter table if exists public.spots
  add column if not exists weather_snapshot jsonb null;

