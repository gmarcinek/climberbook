--liquibase formatted sql

--changeset climberbook:036-add-care-event-ranges
create table care_event_ranges (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  group_id text not null,
  start_date date not null,
  end_date date not null,
  event_type text not null,
  issuer text not null default 'Admin',
  name text not null default '',
  description text not null default '',
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date < end_date)
);

create index care_event_ranges_by_owner_dates
  on care_event_ranges(owner_user_id, start_date, end_date);
create index care_event_ranges_by_owner_group
  on care_event_ranges(owner_user_id, group_id);
create index care_event_ranges_by_owner_type
  on care_event_ranges(owner_user_id, event_type);

grant select, insert, update, delete
  on table care_event_ranges to climberbook_app;

--rollback revoke select, insert, update, delete on table care_event_ranges from climberbook_app;
--rollback drop table if exists care_event_ranges;
