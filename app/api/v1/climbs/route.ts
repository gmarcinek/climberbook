import {
  createClimbInPostgres,
  deleteClimbFromPostgres,
  listClimbsFromPostgres,
  updateClimbInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

type ClimbInput = {
  athleteId: string;
  name: string;
  grade: string;
};

function isClimbInput(value: unknown): value is ClimbInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Record<string, unknown>;
  return (
    typeof input.athleteId === "string" &&
    typeof input.name === "string" &&
    input.name.trim().length > 0 &&
    typeof input.grade === "string"
  );
}

function hasNumericId(value: unknown): value is { id: number } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Number.isInteger((value as { id?: unknown }).id)
  );
}

function invalidClimbResponse() {
  return Response.json(
    { error: "athleteId, name i grade są wymagane." },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return invalidClimbResponse();

  return Response.json({ climbs: await listClimbsFromPostgres(actorId, athleteId) });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isClimbInput(input)) return invalidClimbResponse();

  return Response.json(
    { climb: await createClimbInPostgres(actorId, input) },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isClimbInput(input) || !hasNumericId(input)) return invalidClimbResponse();

  return Response.json({
    climb: await updateClimbInPostgres(actorId, { ...input, id: input.id }),
  });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const climbId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(climbId) || climbId < 1)
    return Response.json({ error: "id wspinaczki jest wymagane." }, { status: 400 });

  await deleteClimbFromPostgres(actorId, climbId);
  return Response.json({ deleted: true });
}