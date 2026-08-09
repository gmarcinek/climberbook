--liquibase formatted sql

--changeset climberbook:023-grant-facility-version-access
grant select, insert on table facility_versions to climberbook_app;

--rollback revoke select, insert on table facility_versions from climberbook_app;