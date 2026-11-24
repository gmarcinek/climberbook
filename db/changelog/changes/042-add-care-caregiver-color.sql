--liquibase formatted sql

--changeset climberbook:042-add-care-caregiver-color
alter table care_caregivers add column color text;

--rollback alter table care_caregivers drop column if exists color;
