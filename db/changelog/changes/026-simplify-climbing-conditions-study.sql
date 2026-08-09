--liquibase formatted sql

--changeset climberbook:026-simplify-climbing-conditions-study
alter table climbing_conditions_study_responses
  drop column discipline,
  drop column exposure,
  drop column route_length_meters,
  drop column is_daylight,
  drop column cloud_cover_percent,
  drop column precipitation_chance_percent,
  add column scenario_date date not null default current_date,
  add column wind_category text not null default 'calm',
  add constraint climbing_conditions_study_wind_category_check
    check (wind_category in ('calm', 'breeze', 'gusts', 'strong', 'halny'));

--rollback alter table climbing_conditions_study_responses drop constraint if exists climbing_conditions_study_wind_category_check;
--rollback alter table climbing_conditions_study_responses drop column if exists wind_category;
--rollback alter table climbing_conditions_study_responses drop column if exists scenario_date;
--rollback alter table climbing_conditions_study_responses add column precipitation_chance_percent integer;
--rollback alter table climbing_conditions_study_responses add column cloud_cover_percent integer;
--rollback alter table climbing_conditions_study_responses add column is_daylight boolean;
--rollback alter table climbing_conditions_study_responses add column route_length_meters integer;
--rollback alter table climbing_conditions_study_responses add column exposure text;
--rollback alter table climbing_conditions_study_responses add column discipline text;