import { queryPostgres } from "@/lib/server/postgres";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

// Oldest date with any care range or confirmed photo; lets the timeline stop paging.
export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    const result = await queryPostgres<{ earliest: string | null }>(
      `
        select to_char(least(
          (select min(start_date) from care_event_ranges where owner_user_id = $1),
          (select min(taken_date) from care_photos where owner_user_id = $1 and status = 'confirmed')
        ), 'YYYY-MM-DD') as earliest
      `,
      [actorId],
    );
    return Response.json({ earliest: result.rows[0]?.earliest ?? null });
  } catch (error) {
    console.error("Care timeline start failed", error);
    return Response.json({ error: "Nie udało się odczytać historii." }, { status: 500 });
  }
}
