import {
  createAthleteInPostgres,
  deleteAthleteFromPostgres,
  listAthletesFromPostgres,
  updateAthleteInPostgres,
} from "@/lib/server/climberbook-repository";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athletes = await listAthletesFromPostgres(actorId);

  return Response.json({ athletes });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  const athlete = await createAthleteInPostgres(actorId, input);

  return Response.json({ athlete }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  if (typeof input.id !== "string" || !input.id.trim()) {
    return Response.json({ error: "id zawodnika jest wymagane." }, { status: 400 });
  }

  const athlete = await updateAthleteInPostgres(actorId, input.id, input);
  return Response.json({ athlete });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("id");
  if (!athleteId)
    return Response.json({ error: "id zawodnika jest wymagane." }, { status: 400 });

  await deleteAthleteFromPostgres(actorId, athleteId);
  return Response.json({ deleted: true });
}