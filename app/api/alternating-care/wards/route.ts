import { randomUUID } from 'node:crypto';
import { getExperimentalActorId } from '@/lib/server/experimental-actor';
import { queryPostgres } from '@/lib/server/postgres';
import {
  isWardKind,
  normalizeBirthDate,
  normalizeLessonPlan,
} from '@utils/careWards';

export const runtime = 'nodejs';

type WardRow = {
  id: string;
  name: string;
  kind: string;
  note: string | null;
  birth_date: string | null;
  lesson_plan: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WARD_COLUMNS = `id, name, kind, note, to_char(birth_date, 'YYYY-MM-DD') as birth_date, lesson_plan`;

const toWard = (row: WardRow) => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  note: row.note,
  birthDate: row.birth_date,
  lessonPlan: normalizeLessonPlan(row.lesson_plan) ?? { lessons: [] },
});

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const result = await queryPostgres<WardRow>(
    `
      select ${WARD_COLUMNS}
      from care_wards
      where owner_user_id = $1
      order by created_at, name
    `,
    [actorId]
  );

  return Response.json({ wards: result.rows.map(toWard) });
}

export async function PUT(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    kind?: string;
    note?: string | null;
    birthDate?: string | null;
    lessonPlan?: unknown;
  };
  const name = body.name?.trim() ?? '';
  const note = body.note?.trim() || null;
  if (!name || name.length > 120 || !isWardKind(body.kind)) {
    return Response.json(
      { error: 'Podaj nazwę i rodzaj podopiecznego.' },
      { status: 400 }
    );
  }
  if (note && note.length > 500) {
    return Response.json({ error: 'Opis jest za długi.' }, { status: 400 });
  }
  if (body.id && !UUID_PATTERN.test(body.id)) {
    return Response.json(
      { error: 'Nieprawidłowy identyfikator podopiecznego.' },
      { status: 400 }
    );
  }

  const hasBirthDate = 'birthDate' in body;
  const birthDate = hasBirthDate ? normalizeBirthDate(body.birthDate) : null;
  if (hasBirthDate && body.birthDate && !birthDate) {
    return Response.json(
      { error: 'Nieprawidłowa data urodzenia.' },
      { status: 400 }
    );
  }
  const hasLessonPlan = 'lessonPlan' in body;
  const lessonPlan = hasLessonPlan
    ? normalizeLessonPlan(body.lessonPlan)
    : null;
  if (hasLessonPlan && !lessonPlan) {
    return Response.json(
      { error: 'Nieprawidłowy plan lekcji.' },
      { status: 400 }
    );
  }

  const result = await queryPostgres<WardRow>(
    `
      insert into care_wards (id, owner_user_id, name, kind, note, birth_date, lesson_plan)
      values ($1, $2, $3, $4, $5, $6::date, coalesce($7::jsonb, '{}'::jsonb))
      on conflict (id)
      do update set
        name = excluded.name,
        kind = excluded.kind,
        note = excluded.note,
        birth_date = case when $8::boolean then excluded.birth_date else care_wards.birth_date end,
        lesson_plan = case when $9::boolean then excluded.lesson_plan else care_wards.lesson_plan end,
        updated_at = now()
      where care_wards.owner_user_id = excluded.owner_user_id
      returning ${WARD_COLUMNS}
    `,
    [
      body.id || randomUUID(),
      actorId,
      name,
      body.kind,
      note,
      birthDate,
      lessonPlan ? JSON.stringify(lessonPlan) : null,
      hasBirthDate,
      hasLessonPlan,
    ]
  );
  const saved = result.rows[0];
  if (!saved) {
    return Response.json(
      { error: 'Nie znaleziono podopiecznego.' },
      { status: 404 }
    );
  }

  return Response.json({ ward: toWard(saved) });
}

export async function DELETE(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !UUID_PATTERN.test(id)) {
    return Response.json(
      { error: 'Brak identyfikatora podopiecznego.' },
      { status: 400 }
    );
  }

  await queryPostgres(
    'delete from care_wards where owner_user_id = $1 and id = $2',
    [actorId, id]
  );
  await queryPostgres(
    'delete from care_user_avatars where owner_user_id = $1 and subject_id = $2',
    [actorId, `other:ward:${id}`]
  );
  return Response.json({ ok: true });
}
