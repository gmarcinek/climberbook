--liquibase formatted sql

--changeset climberbook:008-require-user-email
alter table app_users
  alter column email set not null;

create unique index app_users_email_ci_unique on app_users (lower(email));

--rollback drop index if exists app_users_email_ci_unique;
--rollback alter table app_users alter column email drop not null;