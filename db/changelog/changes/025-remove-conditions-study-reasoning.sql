--liquibase formatted sql

--changeset climberbook:025-remove-conditions-study-reasoning
alter table climbing_conditions_study_responses
  drop column reasoning,
  add column scenario_source text not null default 'synthetic',
  add constraint climbing_conditions_study_source_check
    check (scenario_source in ('geo-weather', 'synthetic'));

--rollback alter table climbing_conditions_study_responses drop constraint if exists climbing_conditions_study_source_check;
--rollback alter table climbing_conditions_study_responses drop column if exists scenario_source;
--rollback alter table climbing_conditions_study_responses add column reasoning text;