--liquibase formatted sql

--changeset climberbook:045-add-care-caregiver-theme-colors
-- Per-theme caregiver colours; `color` stays the light-theme colour.
alter table care_caregivers add column theme_colors jsonb not null default '{}'::jsonb;

--rollback alter table care_caregivers drop column if exists theme_colors;
