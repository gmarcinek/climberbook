--liquibase formatted sql

--changeset climberbook:024-add-climbing-conditions-study
create table climbing_conditions_study_responses (
  id bigint generated always as identity primary key,
  respondent_id uuid not null,
  scenario_version integer not null,
  discipline text not null,
  formation text not null,
  exposure text not null,
  route_length_meters integer not null,
  hour integer not null,
  is_daylight boolean not null,
  sunlight text not null,
  cloud_cover_percent integer not null,
  temperature_c integer not null,
  humidity_percent integer not null,
  wind_kph integer not null,
  precipitation_chance_percent integer not null,
  score integer not null,
  reasoning text,
  created_at timestamptz not null default now(),
  constraint climbing_conditions_study_score_check check (score between 0 and 100),
  constraint climbing_conditions_study_hour_check check (hour between 4 and 22)
);

create index climbing_conditions_study_responses_created_at_idx
  on climbing_conditions_study_responses (created_at desc);

grant insert, select on table climbing_conditions_study_responses to climberbook_app;
grant usage, select on sequence climbing_conditions_study_responses_id_seq to climberbook_app;

--rollback drop table if exists climbing_conditions_study_responses;