--liquibase formatted sql

--changeset climberbook:047-add-care-photo-exif
-- EXIF data read on upload; the stored JPEG itself stays stripped of metadata.
alter table care_photos add column taken_at timestamptz;
alter table care_photos add column latitude double precision;
alter table care_photos add column longitude double precision;
alter table care_photos add column altitude double precision;
alter table care_photos add column camera text not null default '';
alter table care_photos add column exif jsonb not null default '{}'::jsonb;

--rollback alter table care_photos drop column if exists exif;
--rollback alter table care_photos drop column if exists camera;
--rollback alter table care_photos drop column if exists altitude;
--rollback alter table care_photos drop column if exists longitude;
--rollback alter table care_photos drop column if exists latitude;
--rollback alter table care_photos drop column if exists taken_at;
