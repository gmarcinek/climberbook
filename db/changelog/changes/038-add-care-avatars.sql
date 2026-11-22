--liquibase formatted sql

--changeset climberbook:038-add-care-avatars
create table care_user_avatars (
  owner_user_id uuid not null references app_users(id) on delete cascade,
  subject_id text not null,
  avatar_data text not null check (char_length(avatar_data) <= 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, subject_id)
);

create index care_user_avatars_by_owner on care_user_avatars(owner_user_id);

--rollback drop table if exists care_user_avatars;
