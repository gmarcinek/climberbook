--liquibase formatted sql

--changeset climberbook:013-add-ascent-discipline
alter table ascents add column discipline text;

--rollback alter table ascents drop column if exists discipline;