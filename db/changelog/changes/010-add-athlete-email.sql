--liquibase formatted sql

--changeset climberbook:010-add-athlete-email
alter table athletes
  add column email text;

create unique index athletes_by_owner_email
  on athletes (owner_user_id, lower(email))
  where email is not null;

--rollback drop index if exists athletes_by_owner_email;
--rollback alter table athletes drop column if exists email;