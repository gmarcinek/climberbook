import { getExperimentalActorId } from '@/lib/server/experimental-actor';
import { queryPostgres } from '@/lib/server/postgres';
import { authOptions } from '@/lib/server/auth-options';
import { getServerSession } from 'next-auth';

export const runtime = 'nodejs';

const MANUAL_SUBJECT = 'other:manual';
const MAX_AVATAR_LENGTH = 30_000;

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const result = await queryPostgres<{
    subject_id: string;
    avatar_data: string;
  }>(
    `
      select subject_id, avatar_data
      from care_user_avatars
      where owner_user_id = $1
    `,
    [actorId]
  );

  const avatars = Object.fromEntries(
    result.rows.map((row) => [row.subject_id, row.avatar_data])
  );

  const session = await getServerSession(authOptions);
  const sessionImage =
    typeof session?.user?.image === 'string' &&
    (session.user.image.startsWith('https://') ||
      session.user.image.startsWith('data:image/'))
      ? session.user.image
      : null;

  return Response.json({
    own: avatars[`self:${actorId}`] ?? sessionImage,
    avatars,
  });
}

export async function PUT(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const body = (await request.json()) as {
    role?: 'mine' | 'other';
    subjectId?: string;
    avatarData?: string | null;
  };
  if (body.role !== 'mine' && body.role !== 'other') {
    return Response.json({ error: 'Nieprawidłowa rola avatara.' }, { status: 400 });
  }

  const subjectId =
    body.role === 'mine'
      ? `self:${actorId}`
      : body.subjectId?.trim()
        ? `other:${body.subjectId.trim()}`
        : MANUAL_SUBJECT;
  if (body.subjectId && body.subjectId.length > 256) {
    return Response.json({ error: 'Identyfikator jest za długi.' }, { status: 400 });
  }
  if (
    body.avatarData !== null &&
    (typeof body.avatarData !== 'string' ||
      !body.avatarData.startsWith('data:image/webp;base64,') ||
      body.avatarData.length > MAX_AVATAR_LENGTH)
  ) {
    return Response.json({ error: 'Nieprawidłowy avatar.' }, { status: 400 });
  }

  if (body.avatarData === null) {
    await queryPostgres(
      'delete from care_user_avatars where owner_user_id = $1 and subject_id = $2',
      [actorId, subjectId]
    );
  } else {
    await queryPostgres(
      `
        insert into care_user_avatars(owner_user_id, subject_id, avatar_data)
        values ($1, $2, $3)
        on conflict (owner_user_id, subject_id)
        do update set avatar_data = excluded.avatar_data, updated_at = now()
      `,
      [actorId, subjectId, body.avatarData]
    );
  }

  return Response.json({ subjectId, avatarData: body.avatarData });
}
