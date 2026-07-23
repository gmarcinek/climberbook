--liquibase formatted sql

--changeset climberbook:006-add-social-auth-identities
alter table app_users alter column email drop not null;
alter table app_users drop constraint if exists app_users_email_key;

create table auth_identities (
  id uuid primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  email_at_login text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create index auth_identities_by_user on auth_identities(user_id);

--rollback drop table if exists auth_identities;
--rollback alter table app_users alter column email set not null;