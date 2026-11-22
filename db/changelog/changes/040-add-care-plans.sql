--liquibase formatted sql

--changeset climberbook:040-add-care-plans
create table care_plans (
  owner_user_id uuid primary key references app_users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  phases jsonb not null,
  updated_at timestamptz not null default now(),
  check (start_date < end_date)
);

--rollback drop table if exists care_plans;
