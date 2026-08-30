--liquibase formatted sql

--changeset climberbook:033-add-public-training-shares
create table public_training_shares (
  share_id varchar(12) primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  training_id uuid not null references trainings(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint public_training_shares_share_id_check check (share_id ~ '^[A-Za-z0-9_-]{12}$')
);

create index public_training_shares_by_training
  on public_training_shares (training_id, created_at desc);

grant select, insert on table public_training_shares to climberbook_app;

--rollback drop table if exists public_training_shares;
