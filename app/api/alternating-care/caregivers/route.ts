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
  theme_colors: Record<string, string> | null;
};

// Light theme uses the color column; other themes live in 	heme_colors.
const LIGHT_THEME = 'light';
const isThemeName = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(value);

const toCaregiver = (row: CaregiverRow) => ({
  id: row.id,
  subjectId: row.subject_id,
  name: row.name,
  role: row.role,
  linkedUserId: row.linked_user_id,
  color: row.color,
  themeColors: row.theme_colors ?? {},
});

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  const result = await queryPostgres<CaregiverRow>(
    `
      select id, subject_id, name, role, linked_user_id, color, theme_colors
      from care_caregivers
      where owner_user_id = $1
      order by created_at, name
    `,
    [actorId]
  );

  return Response.json({
    caregivers: result.rows.map(toCaregiver),
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
    theme?: string;
  };
  const isSelf = body.subjectId?.trim() === `self:${actorId}`;
  // Only the actor's own self subject is allowed (rejects e.g. `self:` from an anonymous render).
  if (body.subjectId?.trim().startsWith('self:') && !isSelf) {
    return Response.json(
      { error: 'Nieprawidłowy identyfikator opiekuna.' },
      { status: 400 }
    );
  }
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
  const theme = body.theme ?? LIGHT_THEME;
  if (!isThemeName(theme)) {
    return Response.json({ error: 'Nieprawidłowy motyw.' }, { status: 400 });
  }
  const isLightColor = hasColor && theme === LIGHT_THEME;
  const isThemeColor = hasColor && theme !== LIGHT_THEME;

  const id = body.id || randomUUID();
  const subjectId = body.subjectId?.trim() || `caregiver:${id}`;
  const result = await queryPostgres<CaregiverRow>(
    `
      insert into care_caregivers (
        id, owner_user_id, subject_id, name, role, linked_user_id, color,
        theme_colors
      )
      values (
        $1, $2, $3, $4, $5, $6, $7,
        case
          when $9::boolean and $11::text is not null
            then jsonb_build_object($10::text, $11::text)
          else '{}'::jsonb
        end
      )
      on conflict (owner_user_id, subject_id)
      do update set
        name = excluded.name,
        role = excluded.role,
        linked_user_id = excluded.linked_user_id,
        color = case when $8::boolean then excluded.color else care_caregivers.color end,
        theme_colors = case
          when not $9::boolean then care_caregivers.theme_colors
          when $11::text is null then care_caregivers.theme_colors - $10::text
          else care_caregivers.theme_colors || jsonb_build_object($10::text, $11::text)
        end,
        updated_at = now()
      returning id, subject_id, name, role, linked_user_id, color, theme_colors
    `,
    [
      id,
      actorId,
      subjectId,
      name,
      role,
      body.linkedUserId || null,
      isLightColor ? body.color ?? null : null,
      isLightColor,
      isThemeColor,
      theme,
      isThemeColor ? body.color ?? null : null,
    ]
  );
  const saved = result.rows[0];

  return Response.json({ caregiver: toCaregiver(saved) });
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
