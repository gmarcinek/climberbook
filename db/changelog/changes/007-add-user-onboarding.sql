--liquibase formatted sql

--changeset climberbook:007-add-user-onboarding
alter table app_users
  add column onboarding_completed boolean not null default false;

--rollback alter table app_users drop column if exists onboarding_completed;