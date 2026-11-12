-- SITREP Safe private data schema.
-- Review and apply ONLY to a dedicated SITREP Supabase project.
-- This migration is intentionally not applied by deployment automation.

create schema if not exists sitrep;
revoke all on schema sitrep from public, anon, authenticated;
grant usage on schema sitrep to service_role;

create table if not exists sitrep.public_incidents (
  id uuid primary key default gen_random_uuid(),
  source text not null check (length(source) between 2 and 80),
  source_record_id text,
  category text not null check (category in ('earthquake','weather','flood','wildfire','volcano','other')),
  severity text not null default 'unknown' check (severity in ('low','moderate','high','critical','unknown')),
  title text not null check (length(title) between 1 and 240),
  summary text check (summary is null or length(summary) <= 1200),
  area text check (area is null or length(area) <= 240),
  observed_at timestamptz,
  latitude double precision check (latitude is null or latitude between -11.5 and 6.5),
  longitude double precision check (longitude is null or longitude between 94 and 142),
  source_url text check (source_url is null or source_url ~ '^https://'),
  created_at timestamptz not null default now(),
  unique (source, source_record_id)
);

create index if not exists public_incidents_observed_at_idx
  on sitrep.public_incidents (observed_at desc);
create index if not exists public_incidents_category_idx
  on sitrep.public_incidents (category, observed_at desc);

create table if not exists sitrep.source_status (
  source_key text primary key check (length(source_key) between 2 and 80),
  status text not null check (status in ('live','degraded','offline')),
  checked_at timestamptz not null default now(),
  message text check (message is null or length(message) <= 300)
);

-- Defense in depth. The schema is not exposed to the Data API and has no
-- anon/authenticated table grants. A server-side service role is required.
alter table sitrep.public_incidents enable row level security;
alter table sitrep.source_status enable row level security;
revoke all on all tables in schema sitrep from public, anon, authenticated;
revoke all on all sequences in schema sitrep from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema sitrep to service_role;
alter default privileges in schema sitrep
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema sitrep
  grant select, insert, update, delete on tables to service_role;
