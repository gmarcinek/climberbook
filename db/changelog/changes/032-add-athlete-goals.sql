--liquibase formatted sql

--changeset climberbook:032-add-athlete-goals
create table athlete_goals (
  id uuid primary key,
  athlete_id uuid not null references athletes(id) on delete cascade,
  kind text not null,
  title text not null,
  target_value numeric not null,
  target_grade text,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_goals_kind_check check (kind in ('weight', 'training_count', 'route_grade', 'aerobic_coin', 'strength_coin')),
  constraint athlete_goals_status_check check (status in ('active', 'completed', 'archived')),
  constraint athlete_goals_target_value_check check (target_value > 0),
  constraint athlete_goals_date_check check (end_date is null or end_date >= start_date),
  constraint athlete_goals_grade_check check (
    (kind = 'route_grade' and target_grade is not null and length(trim(target_grade)) > 0)
    or kind <> 'route_grade'
  )
);

create index athlete_goals_by_athlete_status on athlete_goals (athlete_id, status, start_date desc);

grant select, insert, update, delete on table athlete_goals to climberbook_app;

--rollback drop table if exists athlete_goals;