import {
  createTrainingInPostgres,
  listTrainingsFromPostgres,
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

  const url = new URL(request.url);
  const athleteId = url.searchParams.get("athleteId") ?? undefined;
  const trainings = await listTrainingsFromPostgres(actorId, athleteId);

  return Response.json({ trainings });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  const training = await createTrainingInPostgres(actorId, input);

  return Response.json({ training }, { status: 201 });
}