--liquibase formatted sql

--changeset climberbook:043-add-care-wards
create table care_wards (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('child', 'animal', 'property', 'senior', 'patient', 'movable')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index care_wards_by_owner on care_wards(owner_user_id);

grant select, insert, update, delete on table care_wards to climberbook_app;

--rollback revoke select, insert, update, delete on table care_wards from climberbook_app;
--rollback drop table if exists care_wards;
