--liquibase formatted sql

--changeset climberbook:048-add-care-photo-category
-- Photo classification: WITH_WARD / WARD / CARE or one of the calendar event types.
alter table care_photos add column category text not null default '';

--rollback alter table care_photos drop column if exists category;
