--liquibase formatted sql

--changeset climberbook:018-add-facility-visibility
alter table facilities
  add column visibility text not null default 'private'
  check (visibility in ('private', 'global'));

create index facilities_by_visibility on facilities(visibility);

--rollback drop index if exists facilities_by_visibility;
--rollback alter table facilities drop column if exists visibility;