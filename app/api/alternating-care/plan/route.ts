import { randomUUID } from 'node:crypto';
import { getExperimentalActorId } from '@/lib/server/experimental-actor';
import { queryPostgres, withPostgresTransaction } from '@/lib/server/postgres';

export const runtime = 'nodejs';

type Phase = {
  caregiverId: string;
  days: number;
};
type CareRangeRow = {
  id: string;
  group_id: string;
  start_date: string;
  end_date: string;
  issuer: string;
  name: string;
  description: string;
  style: Record<string, unknown>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (date: string, amount: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;
  const result = await queryPostgres<{
    start_date: string;
    end_date: string;
    phases: Phase[];
  }>(
    `select start_date, end_date, phases
     from care_plans
     where owner_user_id = $1
     order by updated_at desc
     limit 1`,
    [actorId]
  );
  const plan = result.rows[0];
  return Response.json({
    plan: plan
      ? {
          startDate: plan.start_date,
          endDate: plan.end_date,
          phases: plan.phases,
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;
  const body = (await request.json()) as {
    startDate?: string;
    endDate?: string;
    phases?: Phase[];
  };
  if (
    !body.startDate ||
    !body.endDate ||
    !DATE_PATTERN.test(body.startDate) ||
    !DATE_PATTERN.test(body.endDate) ||
    body.endDate <= body.startDate ||
    !Array.isArray(body.phases) ||
    body.phases.length === 0
  ) {
    return Response.json({ error: 'Nieprawidłowy plan opieki.' }, { status: 400 });
  }
  const startDate = body.startDate;
  const endDate = body.endDate;

  const phases = body.phases.filter(
    (phase) =>
      typeof phase.caregiverId === 'string' &&
      phase.caregiverId.length <= 256 &&
      Number.isInteger(phase.days) &&
      phase.days >= 1 &&
      phase.days <= 31
  );
  if (phases.length !== body.phases.length) {
    return Response.json(
      { error: 'Każdy etap musi mieć opiekuna i 1–31 dni.' },
      { status: 400 }
    );
  }

  const days = Math.round(
    (Date.parse(`${endDate}T00:00:00Z`) -
      Date.parse(`${startDate}T00:00:00Z`)) /
      86_400_000
  ) + 1;
  const endExclusive = addDays(endDate, 1);
  if (days < 1 || days > 3660) {
    return Response.json(
      { error: 'Zakres planu może mieć od 1 dnia do 10 lat.' },
      { status: 400 }
    );
  }

  const cycleDays = phases.reduce((sum, phase) => sum + phase.days, 0);
  const assignments = new Map<string, { name: string; dates: string[] }>();
  let phaseIndex = 0;
  let phaseElapsed = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(startDate, offset);
    const phase = phases[phaseIndex];
    const assignment = assignments.get(phase.caregiverId) ?? {
      name: phase.caregiverId,
      dates: [],
    };
    assignment.dates.push(date);
    assignments.set(phase.caregiverId, assignment);
    phaseElapsed += 1;
    if (phaseElapsed >= phase.days) {
      phaseIndex = (phaseIndex + 1) % phases.length;
      phaseElapsed = 0;
    }
  }

  if (cycleDays < 1) {
    return Response.json({ error: 'Cykl jest pusty.' }, { status: 400 });
  }

  const palette = [
    '#9b8d9b',
    '#8b6f9f',
    '#b06f65',
    '#6f8b78',
    '#8c7a55',
    '#5f8796',
  ];
  const otherSubjects = [
    ...new Set(
      phases
        .map((phase) => phase.caregiverId)
        .filter((subjectId) => !subjectId.startsWith('self:'))
    ),
  ];
  const positionBySubject = new Map(
    otherSubjects.map((subjectId, index) => [subjectId, index + 1])
  );

  await withPostgresTransaction(async (client) => {
    await client.query(
      `
        insert into care_plans(owner_user_id, start_date, end_date, phases)
        values ($1, $2, $3, $4::jsonb)
        on conflict (owner_user_id)
        do update set
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          phases = excluded.phases,
          updated_at = now()
      `,
      [
        actorId,
        startDate,
        endDate,
        JSON.stringify(phases),
      ]
    );
    const overlaps = await client.query<CareRangeRow>(
      `select id, group_id, start_date, end_date, issuer, name, description, style
       from care_event_ranges
       where owner_user_id = $1
         and (group_id = 'ALTERNATING' or group_id like 'CARE:%')
         and start_date < $3::date
         and end_date > $2::date
       for update`,
      [actorId, startDate, endExclusive]
    );
    for (const row of overlaps.rows) {
      await client.query('delete from care_event_ranges where id = $1', [row.id]);
      if (row.start_date < startDate) {
        await client.query(
          `insert into care_event_ranges(
             id, owner_user_id, group_id, start_date, end_date,
             event_type, issuer, name, description, style
           ) values ($1, $2, $3, $4, $5, 'ALTERNATING', $6, $7, $8, $9)`,
          [
            randomUUID(),
            actorId,
            row.group_id,
            row.start_date,
            startDate,
            row.issuer,
            row.name,
            row.description,
            row.style,
          ]
        );
      }
      if (row.end_date > endExclusive) {
        await client.query(
          `insert into care_event_ranges(
             id, owner_user_id, group_id, start_date, end_date,
             event_type, issuer, name, description, style
           ) values ($1, $2, $3, $4, $5, 'ALTERNATING', $6, $7, $8, $9)`,
          [
            randomUUID(),
            actorId,
            row.group_id,
            endExclusive,
            row.end_date,
            row.issuer,
            row.name,
            row.description,
            row.style,
          ]
        );
      }
    }

    for (const [subjectId, assignment] of assignments) {
      const dates = [...assignment.dates].sort();
      let rangeStart = dates[0];
      let previous = dates[0];
      for (let index = 1; index <= dates.length; index += 1) {
        const next = dates[index];
        if (next && addDays(previous, 1) === next) {
          previous = next;
          continue;
        }
        await client.query(
          `insert into care_event_ranges(
             id, owner_user_id, group_id, start_date, end_date,
             event_type, issuer, name, description, style
           )
           values ($1, $2, $3, $4, $5, 'ALTERNATING', $6, $7, '', $8::jsonb)`,
          [
            randomUUID(),
            actorId,
            `CARE:${subjectId}`,
            rangeStart,
            addDays(previous, 1),
            subjectId,
            subjectId,
            JSON.stringify({
              background: subjectId.startsWith('self:')
                ? undefined
                : palette[
                    Math.max(0, (positionBySubject.get(subjectId) ?? 1) - 1) %
                      palette.length
                  ],
              color: '#ffffff',
            }),
          ]
        );
        if (next) {
          rangeStart = next;
          previous = next;
        }
      }
    }
  });

  return Response.json({ ok: true });
}
