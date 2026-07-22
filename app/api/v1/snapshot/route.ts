import { getPostgresDatabaseSnapshot } from "@/lib/server/climberbook-repository";
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

  const snapshot = await getPostgresDatabaseSnapshot(actorId);
  return Response.json(snapshot);
}