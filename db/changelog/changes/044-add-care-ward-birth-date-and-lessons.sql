--liquibase formatted sql

--changeset climberbook:044-add-care-ward-birth-date-and-lessons
alter table care_wards add column birth_date date;
alter table care_wards add column lesson_plan jsonb not null default '{}'::jsonb;

--rollback alter table care_wards drop column if exists lesson_plan;
--rollback alter table care_wards drop column if exists birth_date;
