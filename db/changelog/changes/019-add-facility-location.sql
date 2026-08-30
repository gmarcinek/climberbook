--liquibase formatted sql

--changeset climberbook:019-add-facility-location
alter table facilities
  add column kind text not null default 'indoor_wall'
  check (kind in ('indoor_wall', 'crag', 'crag_sector')),
  add column location_label text,
  add column latitude double precision,
  add column longitude double precision,
  add constraint facilities_coordinates_pair check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  );

create index facilities_by_coordinates on facilities(latitude, longitude)
  where latitude is not null;

--rollback drop index if exists facilities_by_coordinates;
--rollback alter table facilities drop constraint if exists facilities_coordinates_pair;
--rollback alter table facilities drop column if exists longitude;
--rollback alter table facilities drop column if exists latitude;
--rollback alter table facilities drop column if exists location_label;
--rollback alter table facilities drop column if exists kind;