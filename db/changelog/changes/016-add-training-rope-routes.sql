--liquibase formatted sql

--changeset climberbook:016-add-training-rope-routes
alter table trainings add column rope_routes jsonb;

--rollback alter table trainings drop column if exists rope_routes;