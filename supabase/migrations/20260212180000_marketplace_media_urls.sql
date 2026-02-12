-- Marketplace: media urls (1-3 fotos por publicación)

alter table if exists public.marketplace_listings
  add column if not exists media_urls jsonb not null default '[]'::jsonb;

create index if not exists marketplace_listings_media_urls_gin_idx
  on public.marketplace_listings
  using gin (media_urls);

-- Storage bucket (public) for marketplace images
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('marketplace-media', 'marketplace-media', true)
    on conflict (id) do nothing;
  end if;
end $$;

