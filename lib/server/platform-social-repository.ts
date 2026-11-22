import { randomUUID } from "node:crypto";
import {
  queryPostgres,
  withPostgresTransaction,
} from "@/lib/server/postgres";
import type { PoolClient } from "pg";

export class PlatformSocialError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type PlatformSearchUser = {
  id: string;
  displayName: string;
  email: string;
};

export type PlatformRelationship = {
  id: string;
  status: "pending" | "accepted";
  requester: { id: string; displayName: string };
  recipient: { id: string; displayName: string };
  alternatingVisibleToRequester: boolean;
  alternatingVisibleToRecipient: boolean;
  createdAt: string;
  accessGrants?: Array<{
    app: PlatformApp;
    level: PlatformAccessLevel;
    owner: { id: string; displayName: string };
    grantee: { id: string; displayName: string };
  }>;
};

export type PlatformWallComment = {
  id: string;
  author: { id: string; displayName: string };
  body: string;
  createdAt: string;
};

export type PlatformWallPost = {
  id: string;
  author: { id: string; displayName: string };
  body: string;
  createdAt: string;
  comments: PlatformWallComment[];
  likesCount: number;
  likedByMe: boolean;
};

export type PlatformFriendNotification = {
  id: string;
  relationshipId: string | null;
  actor: { id: string; displayName: string };
  kind:
    | "friend-request"
    | "request-accepted"
    | "request-rejected"
    | "access-changed";
  app: PlatformApp | null;
  accessLevel: PlatformAccessLevel | null;
  createdAt: string;
};

export type PlatformApp =
  | "climberbook"
  | "alternating-care"
  | "maps"
  | "models";

export type PlatformAccessLevel = "none" | "notifications" | "read";

type RelationshipRow = {
  id: string;
  status: PlatformRelationship["status"];
  requester_id: string;
  requester_display_name: string;
  recipient_id: string;
  recipient_display_name: string;
  alternating_visible_to_requester: boolean;
  alternating_visible_to_recipient: boolean;
  created_at: Date;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: Date;
};

type PostRow = {
  id: string;
  author_id: string;
  author_display_name: string;
  body: string;
  created_at: Date;
  likes_count: number | string;
  liked_by_me: boolean;
};

function requireNonEmptyString(
  value: unknown,
  field: string,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    throw new PlatformSocialError(`${field} jest wymagane.`, 400);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new PlatformSocialError(
      `${field} musi mieć od 1 do ${maximumLength} znaków.`,
      400,
    );
  }
  return normalized;
}

function requireId(value: unknown, field = "id") {
  const id = requireNonEmptyString(value, field, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new PlatformSocialError(`Nieprawidłowe ${field}.`, 400);
  }
  return id;
}

function asInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PlatformSocialError("Wymagany jest obiekt JSON.", 400);
  }
  return value as Record<string, unknown>;
}

function mapRelationship(row: RelationshipRow): PlatformRelationship {
  return {
    id: row.id,
    status: row.status,
    requester: {
      id: row.requester_id,
      displayName: row.requester_display_name,
    },
    recipient: {
      id: row.recipient_id,
      displayName: row.recipient_display_name,
    },
    alternatingVisibleToRequester:
      row.alternating_visible_to_requester,
    alternatingVisibleToRecipient:
      row.alternating_visible_to_recipient,
    createdAt: row.created_at.toISOString(),
  };
}

function mapComment(row: CommentRow): PlatformWallComment {
  return {
    id: row.id,
    author: {
      id: row.author_id,
      displayName: row.author_display_name,
    },
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

function isPlatformApp(value: unknown): value is PlatformApp {
  return (
    value === "climberbook" ||
    value === "alternating-care" ||
    value === "maps" ||
    value === "models"
  );
}

async function insertNotification(
  client: PoolClient,
  input: {
    relationshipId: string | null;
    actorId: string;
    recipientId: string;
    kind: PlatformFriendNotification["kind"];
    app?: PlatformApp;
    accessLevel?: PlatformAccessLevel;
  },
) {
  await client.query(
    `
      insert into platform_friendship_notifications (
        id, relationship_id, actor_id, recipient_id, kind, app_key, access_level
      )
      values ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      randomUUID(),
      input.relationshipId,
      input.actorId,
      input.recipientId,
      input.kind,
      input.app ?? null,
      input.accessLevel ?? null,
    ],
  );
}

export async function listPlatformUsers(
  actorId: string,
  search: string,
): Promise<PlatformSearchUser[]> {
  const query = search.trim().slice(0, 100);
  if (!query) return [];

  const result = await queryPostgres<{
    id: string;
    email: string;
    display_name: string;
  }>(
    `
      select id, email, display_name
      from app_users
      where id <> $1
        and (display_name ilike $2 or email ilike $2)
      order by display_name, email
      limit 50
    `,
    [actorId, `%${query.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`],
  );

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    email: row.email,
  }));
}

export async function listPlatformRelationships(actorId: string) {
  const result = await queryPostgres<
    RelationshipRow & {
      access_grants: unknown;
    }
  >(
    `
      select f.id, f.status, f.requester_id,
        requester.display_name as requester_display_name,
        f.recipient_id, recipient.display_name as recipient_display_name,
        f.alternating_visible_to_requester,
        f.alternating_visible_to_recipient, f.created_at,
        coalesce((
          select jsonb_agg(jsonb_build_object(
            'app', grant_row.app_key,
            'level', grant_row.access_level,
            'ownerId', grant_row.owner_user_id,
            'ownerDisplayName', owner.display_name,
            'granteeId', grant_row.grantee_user_id,
            'granteeDisplayName', grantee.display_name
          ) order by grant_row.app_key, grant_row.owner_user_id)
          from platform_friendship_access_grants grant_row
          join app_users owner on owner.id = grant_row.owner_user_id
          join app_users grantee on grantee.id = grant_row.grantee_user_id
          where grant_row.relationship_id = f.id
        ), '[]'::jsonb) as access_grants
      from platform_friendships f
      join app_users requester on requester.id = f.requester_id
      join app_users recipient on recipient.id = f.recipient_id
      where f.requester_id = $1 or f.recipient_id = $1
      order by f.created_at desc
    `,
    [actorId],
  );
  return result.rows.map((row) => {
    const relationship = mapRelationship(row);
    const grants = row.access_grants;
    const accessGrants =
      Array.isArray(grants) ? grants : [];
    relationship.accessGrants = accessGrants.flatMap((candidate) => {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        !isPlatformApp((candidate as Record<string, unknown>).app) ||
        !["none", "notifications", "read"].includes(
          String((candidate as Record<string, unknown>).level),
        )
      ) {
        return [];
      }
      const grant = candidate as {
        app: PlatformApp;
        level: PlatformAccessLevel;
        ownerId: string;
        ownerDisplayName: string;
        granteeId: string;
        granteeDisplayName: string;
      };
      return [{
        app: grant.app,
        level: grant.level,
        owner: { id: grant.ownerId, displayName: grant.ownerDisplayName },
        grantee: {
          id: grant.granteeId,
          displayName: grant.granteeDisplayName,
        },
      }];
    });
    return relationship;
  });
}

export async function listPlatformNotifications(actorId: string) {
  const result = await queryPostgres<{
    id: string;
    relationship_id: string | null;
    actor_id: string;
    actor_display_name: string;
    kind: PlatformFriendNotification["kind"];
    app_key: PlatformApp | null;
    access_level: PlatformAccessLevel | null;
    created_at: Date;
  }>(
    `
      select n.id, n.relationship_id, n.actor_id,
        actor.display_name as actor_display_name, n.kind,
        n.app_key, n.access_level, n.created_at
      from platform_friendship_notifications n
      join app_users actor on actor.id = n.actor_id
      where n.recipient_id = $1
      order by n.created_at desc, n.id desc
      limit 100
    `,
    [actorId],
  );
  return result.rows.map(
    (row): PlatformFriendNotification => ({
      id: row.id,
      relationshipId: row.relationship_id,
      actor: { id: row.actor_id, displayName: row.actor_display_name },
      kind: row.kind,
      app: row.app_key,
      accessLevel: row.access_level,
      createdAt: row.created_at.toISOString(),
    }),
  );
}

export async function sendFriendRequest(actorId: string, input: unknown) {
  const recipientId = requireId(asInput(input).recipientId, "recipientId");
  if (recipientId === actorId) {
    throw new PlatformSocialError("Nie można zaprosić własnego konta.", 400);
  }

  const recipient = await queryPostgres<{ id: string }>(
    "select id from app_users where id = $1",
    [recipientId],
  );
  if (!recipient.rows[0]) {
    throw new PlatformSocialError("Nie znaleziono odbiorcy zaproszenia.", 404);
  }

  return withPostgresTransaction(async (client) => {
    const result = await client.query<RelationshipRow>(
      `
      with inserted as (
        insert into platform_friendships (id, requester_id, recipient_id, status)
        select $1, $2, $3, 'pending'
        where not exists (
          select 1 from platform_friendships existing
          where least(existing.requester_id, existing.recipient_id) = least($2::uuid, $3::uuid)
            and greatest(existing.requester_id, existing.recipient_id) = greatest($2::uuid, $3::uuid)
        )
        returning id, status, requester_id, recipient_id,
          alternating_visible_to_requester, alternating_visible_to_recipient, created_at
      )
      select inserted.*, requester.display_name as requester_display_name,
        recipient.display_name as recipient_display_name
      from inserted
      join app_users requester on requester.id = inserted.requester_id
      join app_users recipient on recipient.id = inserted.recipient_id
      `,
      [randomUUID(), actorId, recipientId],
    );
    const relationship = result.rows[0];
    if (!relationship) {
      throw new PlatformSocialError("Relacja z tym użytkownikiem już istnieje.", 409);
    }
    await insertNotification(client, {
      relationshipId: relationship.id,
      actorId,
      recipientId,
      kind: "friend-request",
    });
    return mapRelationship(relationship);
  });
}

export type RelationshipAction =
  | "accept"
  | "reject"
  | "remove"
  | "set-alternating-access"
  | "set-app-access";

export async function updatePlatformRelationship(
  actorId: string,
  relationshipIdInput: string,
  input: unknown,
) {
  const relationshipId = requireId(relationshipIdInput);
  const body = asInput(input);
  const action = body.action;
  if (
    action !== "accept" &&
    action !== "reject" &&
    action !== "remove" &&
    action !== "set-alternating-access" &&
    action !== "set-app-access"
  ) {
    throw new PlatformSocialError("Nieprawidłowa akcja relacji.", 400);
  }

  if (action === "set-alternating-access" || action === "set-app-access") {
    if (typeof body.enabled !== "boolean") {
      throw new PlatformSocialError("enabled musi być wartością logiczną.", 400);
    }
    const app =
      action === "set-alternating-access"
        ? "alternating-care"
        : body.app;
    if (!isPlatformApp(app)) {
      throw new PlatformSocialError("Nieprawidłowa aplikacja.", 400);
    }
    const requestedLevel = body.level;
    if (
      requestedLevel !== undefined &&
      requestedLevel !== "none" &&
      requestedLevel !== "notifications" &&
      requestedLevel !== "read"
    ) {
      throw new PlatformSocialError("Nieprawidłowy poziom dostępu.", 400);
    }
    const accessLevel: PlatformAccessLevel =
      requestedLevel ??
      (body.enabled ? "read" : "none");

    return withPostgresTransaction(async (client) => {
      const relationshipResult = await client.query<{
        requester_id: string;
        recipient_id: string;
      }>(
        `
          select requester_id, recipient_id
          from platform_friendships
          where id = $1 and status = 'accepted'
            and (requester_id = $2 or recipient_id = $2)
          for update
        `,
        [relationshipId, actorId],
      );
      const relationship = relationshipResult.rows[0];
      if (!relationship) {
        throw new PlatformSocialError(
          "Nie znaleziono zaakceptowanej relacji, którą możesz zmienić.",
          404,
        );
      }
      const granteeId =
        relationship.requester_id === actorId
          ? relationship.recipient_id
          : relationship.requester_id;
      await client.query(
        `
          insert into platform_friendship_access_grants (
            relationship_id, owner_user_id, grantee_user_id, app_key, access_level
          )
          values ($1, $2, $3, $4, $5)
          on conflict (relationship_id, owner_user_id, app_key)
          do update set grantee_user_id = excluded.grantee_user_id,
            access_level = excluded.access_level, updated_at = now()
        `,
        [relationshipId, actorId, granteeId, app, accessLevel],
      );
      const result = await client.query<RelationshipRow>(
        `
          with updated as (
            update platform_friendships
            set alternating_visible_to_requester =
                  case when $4 = 'alternating-care' and recipient_id = $2
                    then $3::boolean else alternating_visible_to_requester end,
                alternating_visible_to_recipient =
                  case when $4 = 'alternating-care' and requester_id = $2
                    then $3::boolean else alternating_visible_to_recipient end,
                updated_at = now()
            where id = $1
            returning id, status, requester_id, recipient_id,
              alternating_visible_to_requester, alternating_visible_to_recipient, created_at
          )
          select updated.*, requester.display_name as requester_display_name,
            recipient.display_name as recipient_display_name
          from updated
          join app_users requester on requester.id = updated.requester_id
          join app_users recipient on recipient.id = updated.recipient_id
        `,
        [relationshipId, actorId, accessLevel === "read", app],
      );
      await insertNotification(client, {
        relationshipId,
        actorId,
        recipientId: granteeId,
        kind: "access-changed",
        app,
        accessLevel,
      });
      return mapRelationship(result.rows[0]);
    });
  }

  if (action === "accept") {
    return withPostgresTransaction(async (client) => {
      const result = await client.query<RelationshipRow>(
        `
          with updated as (
            update platform_friendships
            set status = 'accepted', updated_at = now()
            where id = $1 and recipient_id = $2 and status = 'pending'
            returning id, status, requester_id, recipient_id,
              alternating_visible_to_requester, alternating_visible_to_recipient, created_at
          )
          select updated.*, requester.display_name as requester_display_name,
            recipient.display_name as recipient_display_name
          from updated
          join app_users requester on requester.id = updated.requester_id
          join app_users recipient on recipient.id = updated.recipient_id
        `,
        [relationshipId, actorId],
      );
      if (!result.rows[0]) {
        throw new PlatformSocialError(
          "Tylko odbiorca może zaakceptować oczekujące zaproszenie.",
          403,
        );
      }
      await insertNotification(client, {
        relationshipId,
        actorId,
        recipientId: result.rows[0].requester_id,
        kind: "request-accepted",
      });
      return mapRelationship(result.rows[0]);
    });
  }

  await withPostgresTransaction(async (client) => {
    const relationshipResult = await client.query<{
      requester_id: string;
      recipient_id: string;
      status: PlatformRelationship["status"];
    }>(
      `
        select requester_id, recipient_id, status
        from platform_friendships
        where id = $1
        for update
      `,
      [relationshipId],
    );
    const relationship = relationshipResult.rows[0];
    const authorized =
      action === "reject"
        ? relationship?.recipient_id === actorId &&
          relationship.status === "pending"
        : relationship?.requester_id === actorId ||
          relationship?.recipient_id === actorId;
    if (!relationship || !authorized) {
      throw new PlatformSocialError(
        action === "reject"
          ? "Tylko odbiorca może odrzucić oczekujące zaproszenie."
          : "Nie znaleziono relacji, którą możesz usunąć.",
        action === "reject" ? 403 : 404,
      );
    }
    if (action === "reject") {
      await insertNotification(client, {
        relationshipId: null,
        actorId,
        recipientId: relationship.requester_id,
        kind: "request-rejected",
      });
    }
    await client.query("delete from platform_friendships where id = $1", [
      relationshipId,
    ]);
  });
  return null;
}

export async function listWallPosts(actorId: string): Promise<PlatformWallPost[]> {
  const postsResult = await queryPostgres<PostRow>(
    `
      select p.id, p.author_id, author.display_name as author_display_name,
        p.body, p.created_at,
        count(likes.user_id)::int as likes_count,
        coalesce(bool_or(likes.user_id = $1), false) as liked_by_me
      from platform_wall_posts p
      join app_users author on author.id = p.author_id
      left join platform_wall_post_likes likes on likes.post_id = p.id
      group by p.id, author.display_name
      order by p.created_at desc, p.id desc
      limit 100
    `,
    [actorId],
  );
  if (postsResult.rows.length === 0) return [];

  const postIds = postsResult.rows.map((row) => row.id);
  const commentsResult = await queryPostgres<CommentRow>(
    `
      select c.id, c.post_id, c.author_id,
        author.display_name as author_display_name, c.body, c.created_at
      from platform_wall_comments c
      join app_users author on author.id = c.author_id
      where c.post_id = any($1::uuid[])
      order by c.post_id, c.created_at, c.id
    `,
    [postIds],
  );
  const commentsByPost = new Map<string, PlatformWallComment[]>();
  for (const row of commentsResult.rows) {
    const comments = commentsByPost.get(row.post_id) ?? [];
    comments.push(mapComment(row));
    commentsByPost.set(row.post_id, comments);
  }

  return postsResult.rows.map((row) => ({
    id: row.id,
    author: {
      id: row.author_id,
      displayName: row.author_display_name,
    },
    body: row.body,
    createdAt: row.created_at.toISOString(),
    comments: commentsByPost.get(row.id) ?? [],
    likesCount: Number(row.likes_count),
    likedByMe: row.liked_by_me,
  }));
}

export async function createWallPost(actorId: string, input: unknown) {
  const body = requireNonEmptyString(asInput(input).body, "body", 5000);
  const result = await queryPostgres<{
    id: string;
    author_id: string;
    body: string;
    created_at: Date;
    author_display_name: string;
  }>(
    `
      with inserted as (
        insert into platform_wall_posts (id, author_id, body)
        values ($1, $2, $3)
        returning id, author_id, body, created_at
      )
      select inserted.*, author.display_name as author_display_name
      from inserted
      join app_users author on author.id = inserted.author_id
    `,
    [randomUUID(), actorId, body],
  );
  const row = result.rows[0];
  return {
    id: row.id,
    author: { id: row.author_id, displayName: row.author_display_name },
    body: row.body,
    createdAt: row.created_at.toISOString(),
    comments: [],
    likesCount: 0,
    likedByMe: false,
  } satisfies PlatformWallPost;
}

export async function deleteWallPost(actorId: string, postIdInput: string) {
  const postId = requireId(postIdInput, "postId");
  const result = await queryPostgres(
    "delete from platform_wall_posts where id = $1 and author_id = $2 returning id",
    [postId, actorId],
  );
  if (!result.rows[0]) {
    throw new PlatformSocialError(
      "Nie znaleziono własnego wpisu do usunięcia.",
      404,
    );
  }
}

export async function listWallComments(postIdInput: string) {
  const postId = requireId(postIdInput, "postId");
  const result = await queryPostgres<CommentRow>(
    `
      select c.id, c.post_id, c.author_id,
        author.display_name as author_display_name, c.body, c.created_at
      from platform_wall_comments c
      join app_users author on author.id = c.author_id
      where c.post_id = $1
      order by c.created_at, c.id
    `,
    [postId],
  );
  return result.rows.map(mapComment);
}

export async function createWallComment(
  actorId: string,
  postIdInput: string,
  input: unknown,
) {
  const postId = requireId(postIdInput, "postId");
  const body = requireNonEmptyString(asInput(input).body, "body", 2000);
  const result = await queryPostgres<CommentRow>(
    `
      with inserted as (
        insert into platform_wall_comments (id, post_id, author_id, body)
        select $1, p.id, $2, $3
        from platform_wall_posts p
        where p.id = $4
        returning id, post_id, author_id, body, created_at
      )
      select inserted.*, author.display_name as author_display_name
      from inserted
      join app_users author on author.id = inserted.author_id
    `,
    [randomUUID(), actorId, body, postId],
  );
  if (!result.rows[0]) {
    throw new PlatformSocialError("Nie znaleziono wpisu.", 404);
  }
  return mapComment(result.rows[0]);
}

export async function deleteWallComment(
  actorId: string,
  postIdInput: string,
  commentIdInput: string,
) {
  const postId = requireId(postIdInput, "postId");
  const commentId = requireId(commentIdInput, "commentId");
  const result = await queryPostgres(
    `
      delete from platform_wall_comments
      where id = $1 and post_id = $2 and author_id = $3
      returning id
    `,
    [commentId, postId, actorId],
  );
  if (!result.rows[0]) {
    throw new PlatformSocialError(
      "Nie znaleziono własnego komentarza do usunięcia.",
      404,
    );
  }
}

export async function setWallPostLike(
  actorId: string,
  postIdInput: string,
  liked: boolean,
) {
  const postId = requireId(postIdInput, "postId");
  const post = await queryPostgres<{ id: string }>(
    "select id from platform_wall_posts where id = $1",
    [postId],
  );
  if (!post.rows[0]) {
    throw new PlatformSocialError("Nie znaleziono wpisu.", 404);
  }
  if (liked) {
    await queryPostgres(
      `
        insert into platform_wall_post_likes (post_id, user_id)
        values ($1, $2)
        on conflict (post_id, user_id) do nothing
      `,
      [postId, actorId],
    );
  } else {
    await queryPostgres(
      "delete from platform_wall_post_likes where post_id = $1 and user_id = $2",
      [postId, actorId],
    );
  }
  const count = await queryPostgres<{ likes_count: number | string }>(
    "select count(*)::int as likes_count from platform_wall_post_likes where post_id = $1",
    [postId],
  );
  return { liked, likesCount: Number(count.rows[0].likes_count) };
}

export function platformSocialErrorResponse(error: unknown) {
  if (error instanceof PlatformSocialError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
