--liquibase formatted sql

--changeset climberbook:035-add-map-records
create table map_records (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  kind text not null,
  slug text not null,
  name text not null,
  country_code text not null,
  region_id text,
  latitude double precision,
  longitude double precision,
  summary text not null,
  details jsonb not null default '{}',
  sources jsonb not null,
  confidence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_records_kind_check check (
    kind in ('climbing_area', 'rescue_region', 'rescue_service', 'rescue_incident')
  ),
  constraint map_records_confidence_check check (confidence in ('high', 'medium', 'low')),
  constraint map_records_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint map_records_sources_check check (
    jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) > 0
  ),
  constraint map_records_owner_kind_slug_unique unique (owner_user_id, kind, slug)
);

create index map_records_by_owner_kind
  on map_records (owner_user_id, kind, updated_at desc);

grant select, insert, update, delete on table map_records to climberbook_app;

--rollback drop table if exists map_records;