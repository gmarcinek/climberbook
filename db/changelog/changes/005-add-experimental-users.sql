--liquibase formatted sql

--changeset climberbook:005-add-experimental-users
create table app_users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table sections
  add column owner_user_id uuid not null references app_users(id) on delete cascade;

alter table athletes
  add column owner_user_id uuid not null references app_users(id) on delete cascade;

alter table facilities
  add column owner_user_id uuid not null references app_users(id) on delete cascade;

create index sections_by_owner_user on sections(owner_user_id);
create index athletes_by_owner_user on athletes(owner_user_id);
create index facilities_by_owner_user on facilities(owner_user_id);

--rollback drop table if exists app_users;