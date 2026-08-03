--liquibase formatted sql

--changeset climberbook:014-add-facility-capabilities
alter table facilities
  add column capabilities jsonb not null default '{"activities": [], "ropeWalls": []}'::jsonb;

--rollback alter table facilities drop column if exists capabilities;