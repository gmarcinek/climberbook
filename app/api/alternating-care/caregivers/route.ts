import { randomUUID } from 'node:crypto';
import { getExperimentalActorId } from '@/lib/server/experimental-actor';
import { queryPostgres } from '@/lib/server/postgres';
import { isCareColor } from '@utils/caregiverColors';

export const runtime = 'nodejs';

type CaregiverRow = {
  id: string;
  subject_id: string;
  name: string;
  role: string;
  linked_user_id: string | null;
  color: string | null;
};

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const result = await queryPostgres<CaregiverRow>(
    `
      select id, subject_id, name, role, linked_user_id, color
      from care_caregivers
      where owner_user_id = $1
      order by created_at, name
    `,
    [actorId]
  );

  return Response.json({
    caregivers: result.rows.map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      role: row.role,
      linkedUserId: row.linked_user_id,
      color: row.color,
    })),
  });
}

export async function PUT(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const body = (await request.json()) as {
    id?: string;
    subjectId?: string;
    name?: string;
    role?: string;
    linkedUserId?: string | null;
    color?: string | null;
  };
  const isSelf = body.subjectId?.trim() === `self:${actorId}`;
  const name = body.name?.trim() || (isSelf ? 'Ja' : '');
  const role = body.role?.trim();
  if (!name || name.length > 120 || !role || role.length > 80) {
    return Response.json(
      { error: 'Podaj imię i rolę opiekuna.' },
      { status: 400 }
    );
  }

  const hasColor = 'color' in body;
  if (hasColor && body.color !== null && !isCareColor(body.color)) {
    return Response.json({ error: 'Nieprawidłowy kolor.' }, { status: 400 });
  }

  const id = body.id || randomUUID();
  const subjectId = body.subjectId?.trim() || `caregiver:${id}`;
  const result = await queryPostgres<CaregiverRow>(
    `
      insert into care_caregivers (
        id, owner_user_id, subject_id, name, role, linked_user_id, color
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (owner_user_id, subject_id)
      do update set
        name = excluded.name,
        role = excluded.role,
        linked_user_id = excluded.linked_user_id,
        color = case when $8::boolean then excluded.color else care_caregivers.color end,
        updated_at = now()
      returning id, subject_id, name, role, linked_user_id, color
    `,
    [
      id,
      actorId,
      subjectId,
      name,
      role,
      body.linkedUserId || null,
      hasColor ? body.color ?? null : null,
      hasColor,
    ]
  );
  const saved = result.rows[0];

  return Response.json({
    caregiver: {
      id: saved.id,
      subjectId: saved.subject_id,
      name: saved.name,
      role: saved.role,
      linkedUserId: saved.linked_user_id,
      color: saved.color,
    },
  });
}

export async function DELETE(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Brak identyfikatora opiekuna.' }, { status: 400 });
  }

  await queryPostgres(
    'delete from care_caregivers where owner_user_id = $1 and id = $2',
    [actorId, id]
  );
  return Response.json({ ok: true });
}
