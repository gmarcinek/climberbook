--liquibase formatted sql

--changeset climberbook:021-add-facility-versions
create table facility_versions (
  facility_id uuid not null references facilities(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null,
  capabilities jsonb not null,
  kind text not null check (kind in ('indoor_wall', 'crag', 'crag_sector')),
  location_label text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  primary key (facility_id, version),
  check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

insert into facility_versions (
  facility_id, version, name, capabilities, kind, location_label, latitude, longitude, created_at
)
select id, 1, name, capabilities, kind, location_label, latitude, longitude, created_at
from facilities;

alter table trainings
  add column facility_id uuid,
  add column facility_version integer,
  add constraint trainings_facility_reference_pair check (
    (facility_id is null and facility_version is null)
    or (facility_id is not null and facility_version is not null)
  ),
  add constraint trainings_facility_version_fk
    foreign key (facility_id, facility_version)
    references facility_versions(facility_id, version);

create index facility_versions_by_facility_latest
  on facility_versions(facility_id, version desc);

create index trainings_by_facility_version
  on trainings(facility_id, facility_version)
  where facility_id is not null;

--rollback drop index if exists trainings_by_facility_version;
--rollback drop index if exists facility_versions_by_facility_latest;
--rollback alter table trainings drop constraint if exists trainings_facility_version_fk;
--rollback alter table trainings drop constraint if exists trainings_facility_reference_pair;
--rollback alter table trainings drop column if exists facility_version;
--rollback alter table trainings drop column if exists facility_id;
--rollback drop table if exists facility_versions;