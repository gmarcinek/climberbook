import { getExperimentalActorId } from '@/lib/server/experimental-actor';
import { withPostgresTransaction } from '@/lib/server/postgres';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== 'string') return actorId;

  await withPostgresTransaction(async (client) => {
    await client.query(
      'delete from care_event_ranges where owner_user_id = $1',
      [actorId]
    );
    await client.query(
      'delete from care_plans where owner_user_id = $1',
      [actorId]
    );
  });

  return Response.json({ ok: true });
}
