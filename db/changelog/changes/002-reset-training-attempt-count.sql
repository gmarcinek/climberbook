--liquibase formatted sql

--changeset climberbook:002-reset-training-attempt-count
update trainings
set attempts_count = 0
where attempts_count <> 0;

--rollback update trainings set attempts_count = 0;