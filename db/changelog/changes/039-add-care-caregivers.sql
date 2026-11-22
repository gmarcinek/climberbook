--liquibase formatted sql

--changeset climberbook:039-add-care-caregivers
create table care_caregivers (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  subject_id text not null,
  name text not null,
  role text not null,
  linked_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, subject_id)
);

create index care_caregivers_by_owner on care_caregivers(owner_user_id);

--rollback drop table if exists care_caregivers;
