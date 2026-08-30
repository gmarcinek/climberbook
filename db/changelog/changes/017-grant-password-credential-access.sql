--liquibase formatted sql

--changeset climberbook:017-grant-password-credential-access
grant select, insert, update, delete on table auth_password_credentials to climberbook_app;

--rollback revoke select, insert, update, delete on table auth_password_credentials from climberbook_app;