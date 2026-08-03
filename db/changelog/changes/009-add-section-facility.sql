--liquibase formatted sql

--changeset climberbook:009-add-section-facility
alter table sections
  add column facility_id uuid references facilities(id) on delete set null;

create index sections_by_facility on sections(facility_id);

--rollback drop index if exists sections_by_facility;
--rollback alter table sections drop column if exists facility_id;