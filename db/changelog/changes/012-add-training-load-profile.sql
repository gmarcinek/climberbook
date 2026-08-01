--liquibase formatted sql

--changeset climberbook:012-add-training-load-profile
alter table trainings add column load_profile jsonb;

--rollback alter table trainings drop column if exists load_profile;