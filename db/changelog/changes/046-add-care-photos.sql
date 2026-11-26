--liquibase formatted sql

--changeset climberbook:046-add-care-photos
-- Photos are stored as re-encoded JPEG (max 1024x1024, quality 65).
-- New uploads wait in the "pending" queue until they are described and confirmed.
create table care_photos (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  group_id text,
  taken_date date not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  width integer not null,
  height integer not null,
  byte_size integer not null,
  image_data bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index care_photos_by_owner_date on care_photos(owner_user_id, taken_date);
create index care_photos_by_owner_group on care_photos(owner_user_id, group_id);

-- Acceptance of the photo terms; uploads are refused without it.
create table care_photo_consents (
  owner_user_id uuid primary key references app_users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now()
);

grant select, insert, update, delete on table care_photos to climberbook_app;
grant select, insert, update, delete on table care_photo_consents to climberbook_app;

--rollback revoke select, insert, update, delete on table care_photo_consents from climberbook_app;
--rollback revoke select, insert, update, delete on table care_photos from climberbook_app;
--rollback drop table if exists care_photo_consents;
--rollback drop table if exists care_photos;
