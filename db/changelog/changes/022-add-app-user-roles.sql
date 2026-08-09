--liquibase formatted sql

--changeset climberbook:022-add-app-user-roles
alter table app_users
  add column access_role text not null default 'member'
  check (access_role in ('member', 'admin'));

update app_users
set access_role = 'admin'
where lower(email) = 'grzegorz.marcinek@gmail.com';

create index app_users_by_access_role on app_users(access_role);

--rollback drop index if exists app_users_by_access_role;
--rollback alter table app_users drop column if exists access_role;