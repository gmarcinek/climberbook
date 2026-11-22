--liquibase formatted sql

--changeset climberbook:037-add-platform-friendships-and-wall
create table platform_friendships (
  id uuid primary key,
  requester_id uuid not null references app_users(id) on delete cascade,
  recipient_id uuid not null references app_users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  alternating_visible_to_requester boolean not null default false,
  alternating_visible_to_recipient boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id),
  unique (requester_id, recipient_id)
);

create unique index platform_friendships_by_pair
  on platform_friendships (
    least(requester_id, recipient_id),
    greatest(requester_id, recipient_id)
  );
create index platform_friendships_by_requester_status
  on platform_friendships (requester_id, status);
create index platform_friendships_by_recipient_status
  on platform_friendships (recipient_id, status);

create table platform_friendship_access_grants (
  relationship_id uuid not null references platform_friendships(id) on delete cascade,
  owner_user_id uuid not null references app_users(id) on delete cascade,
  grantee_user_id uuid not null references app_users(id) on delete cascade,
  app_key text not null check (
    app_key in ('climberbook', 'alternating-care', 'maps', 'models')
  ),
  access_level text not null default 'none' check (
    access_level in ('none', 'notifications', 'read')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (relationship_id, owner_user_id, app_key),
  check (owner_user_id <> grantee_user_id)
);

create index platform_friendship_access_grants_by_grantee
  on platform_friendship_access_grants (grantee_user_id, app_key, access_level);

create table platform_friendship_notifications (
  id uuid primary key,
  relationship_id uuid references platform_friendships(id) on delete set null,
  actor_id uuid not null references app_users(id) on delete cascade,
  recipient_id uuid not null references app_users(id) on delete cascade,
  kind text not null check (
    kind in ('friend-request', 'request-accepted', 'request-rejected', 'access-changed')
  ),
  app_key text check (
    app_key is null or
    app_key in ('climberbook', 'alternating-care', 'maps', 'models')
  ),
  access_level text check (
    access_level is null or access_level in ('none', 'notifications', 'read')
  ),
  created_at timestamptz not null default now()
);

create index platform_friendship_notifications_by_recipient
  on platform_friendship_notifications (recipient_id, created_at desc, id desc);

create table platform_wall_posts (
  id uuid primary key,
  author_id uuid not null references app_users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index platform_wall_posts_by_created_at
  on platform_wall_posts (created_at desc, id desc);

create table platform_wall_comments (
  id uuid primary key,
  post_id uuid not null references platform_wall_posts(id) on delete cascade,
  author_id uuid not null references app_users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index platform_wall_comments_by_post
  on platform_wall_comments (post_id, created_at, id);

create table platform_wall_post_likes (
  post_id uuid not null references platform_wall_posts(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

grant select, insert, update, delete
  on table platform_friendships to climberbook_app;
grant select, insert, update, delete
  on table platform_friendship_access_grants to climberbook_app;
grant select, insert
  on table platform_friendship_notifications to climberbook_app;
grant select, insert, delete
  on table platform_wall_posts to climberbook_app;
grant select, insert, delete
  on table platform_wall_comments to climberbook_app;
grant select, insert, delete
  on table platform_wall_post_likes to climberbook_app;

--rollback revoke select, insert, delete on table platform_wall_post_likes from climberbook_app;
--rollback revoke select, insert, delete on table platform_wall_comments from climberbook_app;
--rollback revoke select, insert, delete on table platform_wall_posts from climberbook_app;
--rollback revoke select, insert on table platform_friendship_notifications from climberbook_app;
--rollback revoke select, insert, update, delete on table platform_friendship_access_grants from climberbook_app;
--rollback revoke select, insert, update, delete on table platform_friendships from climberbook_app;
--rollback drop table if exists platform_wall_post_likes;
--rollback drop table if exists platform_wall_comments;
--rollback drop table if exists platform_wall_posts;
--rollback drop table if exists platform_friendship_notifications;
--rollback drop table if exists platform_friendship_access_grants;
--rollback drop table if exists platform_friendships;
