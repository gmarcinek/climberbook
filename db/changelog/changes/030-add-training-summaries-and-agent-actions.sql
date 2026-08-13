--liquibase formatted sql

--changeset climberbook:030-add-training-summaries-and-agent-actions
create table training_summaries (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  scope text not null,
  period_start text not null,
  period_end text not null,
  training_id uuid references trainings(id) on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_summaries_scope_check check (scope in ('training', 'week', 'month')),
  constraint training_summaries_period_check check (period_start <= period_end),
  constraint training_summaries_unique_period unique nulls not distinct (
    owner_user_id, scope, period_start, period_end, training_id
  )
);

create index training_summaries_by_owner_period
  on training_summaries (owner_user_id, period_start desc, period_end desc);

create table agent_actions (
  id uuid primary key,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  kind text not null,
  status text not null default 'todo',
  title text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_actions_kind_check check (kind in ('summarize_training', 'summarize_week', 'summarize_month', 'write_article')),
  constraint agent_actions_status_check check (status in ('todo', 'done'))
);

create index agent_actions_by_owner_status
  on agent_actions (owner_user_id, status, created_at desc);

grant select, insert, update, delete on table training_summaries, agent_actions to climberbook_app;

--rollback drop table if exists agent_actions;
--rollback drop table if exists training_summaries;