--liquibase formatted sql

--changeset climberbook:049-add-care-photo-place
-- Place resolved from GPS (reverse geocoding). NULL = not looked up yet, '' = nothing found.
alter table care_photos add column place text;
alter table care_photos add column country text;
alter table care_photos add column country_code text;

--rollback alter table care_photos drop column if exists place;
--rollback alter table care_photos drop column if exists country;
--rollback alter table care_photos drop column if exists country_code;
