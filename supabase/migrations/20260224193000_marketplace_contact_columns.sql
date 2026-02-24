-- Marketplace: migrate metadata out of description into real columns

alter table if exists public.marketplace_listings
  add column if not exists city text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

-- Backfill new columns from legacy prefixed lines inside description
update public.marketplace_listings
set
  city = coalesce(
    nullif(trim(city), ''),
    nullif(trim((regexp_match(description, '(?mi)^(?:Ciudad|City|Cidade):\s*(.+)$'))[1]), '')
  ),
  contact_phone = coalesce(
    nullif(trim(contact_phone), ''),
    nullif(trim((regexp_match(description, '(?mi)^(?:Tel|Phone|Telefone):\s*(.+)$'))[1]), '')
  ),
  contact_email = coalesce(
    nullif(trim(contact_email), ''),
    nullif(trim(lower((regexp_match(description, '(?mi)^Email:\s*(.+)$'))[1])), '')
  )
where description is not null;

-- Remove legacy metadata prefixes from description body
update public.marketplace_listings
set description = nullif(
  trim(
    regexp_replace(
      description,
      '(?mi)^(?:Ciudad|City|Cidade):.*(?:\r?\n)?|^(?:Tel|Phone|Telefone):.*(?:\r?\n)?|^Email:.*(?:\r?\n)?',
      '',
      'g'
    )
  ),
  ''
)
where description is not null;
