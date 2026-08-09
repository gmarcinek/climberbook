--liquibase formatted sql

--changeset climberbook:029-remove-conditions-study-date
alter table climbing_conditions_study_responses
  drop column scenario_date;

update climbing_conditions_study_responses
set scenario_version = 5
where scenario_version = 4;

--rollback alter table climbing_conditions_study_responses add column scenario_date date not null default current_date;
--rollback update climbing_conditions_study_responses set scenario_version = 4 where scenario_version = 5;