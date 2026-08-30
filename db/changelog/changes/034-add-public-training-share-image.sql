--liquibase formatted sql

--changeset climberbook:034-add-public-training-share-image
alter table public_training_shares
  add column image_data bytea,
  add column image_content_type text;

alter table public_training_shares
  add constraint public_training_shares_image_content_type_check check (
    image_content_type is null or image_content_type = 'image/jpeg'
  );

grant update (image_data, image_content_type) on table public_training_shares to climberbook_app;

--rollback alter table public_training_shares drop constraint if exists public_training_shares_image_content_type_check;
--rollback alter table public_training_shares drop column if exists image_content_type;
--rollback alter table public_training_shares drop column if exists image_data;
