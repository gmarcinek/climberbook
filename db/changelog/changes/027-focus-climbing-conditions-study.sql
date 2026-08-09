--liquibase formatted sql

--changeset climberbook:027-focus-climbing-conditions-study
alter table climbing_conditions_study_responses
  drop column formation,
  drop column sunlight;

update climbing_conditions_study_responses
set scenario_version = 3
where scenario_version = 2;

--rollback alter table climbing_conditions_study_responses add column formation text not null default 'vertical';
--rollback alter table climbing_conditions_study_responses add column sunlight text not null default 'mixed';
--rollback update climbing_conditions_study_responses set scenario_version = 2 where scenario_version = 3;