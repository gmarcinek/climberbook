--liquibase formatted sql

--changeset climberbook:020-add-training-weather-snapshot
alter table trainings add column weather_snapshot jsonb;

--rollback alter table trainings drop column if exists weather_snapshot;