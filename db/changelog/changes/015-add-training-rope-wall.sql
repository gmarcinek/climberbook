--liquibase formatted sql

--changeset climberbook:015-add-training-rope-wall
alter table trainings add column rope_wall_name text;

--rollback alter table trainings drop column if exists rope_wall_name;