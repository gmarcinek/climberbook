--liquibase formatted sql

--changeset climberbook:011-add-password-auth
create table auth_password_credentials (
  user_id uuid primary key references app_users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

--rollback drop table if exists auth_password_credentials;