--liquibase formatted sql

--changeset climberbook:031-add-agent-feed-items
create table agent_feed_items (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  training_id uuid references trainings(id) on delete set null,
  published_at timestamptz not null default now(),
  constraint agent_feed_items_kind_check check (kind in ('article', 'news', 'training_note'))
);

create index agent_feed_items_by_owner_published
  on agent_feed_items (owner_user_id, published_at desc);

grant select, insert, delete on table agent_feed_items to climberbook_app;

--rollback drop table if exists agent_feed_items;