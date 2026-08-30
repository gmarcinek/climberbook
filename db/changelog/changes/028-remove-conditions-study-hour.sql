--liquibase formatted sql

--changeset climberbook:028-remove-conditions-study-hour
alter table climbing_conditions_study_responses
  drop column hour;

update climbing_conditions_study_responses
set scenario_version = 4
where scenario_version = 3;

--rollback alter table climbing_conditions_study_responses add column hour integer not null default 12 check (hour between 4 and 22);
--rollback update climbing_conditions_study_responses set scenario_version = 3 where scenario_version = 4;