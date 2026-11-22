import { mapRecordKinds, type MapRecordKind } from "@/lib/map-records";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import { listMapRecordsFromPostgres } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

function isMapRecordKind(value: string | null): value is MapRecordKind {
  return (
    typeof value === "string" && mapRecordKinds.includes(value as MapRecordKind)
  );
}

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (actorId instanceof Response) return actorId;

  const url = new URL(request.url);
  const requestedKind = url.searchParams.get("kind");
  if (requestedKind !== null && !isMapRecordKind(requestedKind))
    return Response.json(
      { error: "Nieprawidłowy typ rekordu mapy." },
      { status: 400 },
    );

  const records = await listMapRecordsFromPostgres(actorId, {
    kind: requestedKind ?? undefined,
    query: url.searchParams.get("query") ?? undefined,
  });
  return Response.json({ records });
}
