--liquibase formatted sql

--changeset climberbook:041-grant-care-planning-access
grant select, insert, update, delete on table care_user_avatars to climberbook_app;
grant select, insert, update, delete on table care_caregivers to climberbook_app;
grant select, insert, update, delete on table care_plans to climberbook_app;

--rollback revoke select, insert, update, delete on table care_plans from climberbook_app;
--rollback revoke select, insert, update, delete on table care_caregivers from climberbook_app;
--rollback revoke select, insert, update, delete on table care_user_avatars from climberbook_app;
