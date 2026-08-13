import { createPublicTrainingShareInPostgres } from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json().catch(() => null);
  const trainingId =
    input &&
    typeof input === "object" &&
    typeof (input as { trainingId?: unknown }).trainingId === "string"
      ? (input as { trainingId: string }).trainingId
      : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trainingId,
    )
  ) {
    return Response.json(
      { error: "Wymagany jest poprawny identyfikator treningu." },
      { status: 400 },
    );
  }

  const share = await createPublicTrainingShareInPostgres(actorId, trainingId);
  return Response.json({ shareId: share.id }, { status: 201 });
}
