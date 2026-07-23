import {
  createWeightEntryInPostgres,
  deleteWeightEntryFromPostgres,
  listWeightEntriesFromPostgres,
  updateWeightEntryInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

function invalidWeightEntryResponse() {
  return Response.json(
    { error: "athleteId, date, time i dodatnie weightKg są wymagane." },
    { status: 400 },
  );
}

function isWeightEntryInput(value: unknown): value is {
  athleteId: string;
  date: string;
  time: string;
  weightKg: number;
} {
  if (!value || typeof value !== "object") return false;

  const input = value as Record<string, unknown>;
  return (
    typeof input.athleteId === "string" &&
    typeof input.date === "string" &&
    typeof input.time === "string" &&
    typeof input.weightKg === "number" &&
    input.weightKg > 0
  );
}

function hasNumericId(value: unknown): value is { id: number } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Number.isInteger((value as { id?: unknown }).id)
  );
}

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return invalidWeightEntryResponse();

  const weightEntries = await listWeightEntriesFromPostgres(actorId, athleteId);
  return Response.json({ weightEntries });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isWeightEntryInput(input)) return invalidWeightEntryResponse();

  const weightEntry = await createWeightEntryInPostgres(actorId, input);
  return Response.json({ weightEntry }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isWeightEntryInput(input) || !hasNumericId(input)) {
    return invalidWeightEntryResponse();
  }

  const weightEntry = await updateWeightEntryInPostgres(actorId, {
    ...input,
    id: input.id,
  });
  return Response.json({ weightEntry });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const entryId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(entryId) || entryId < 1)
    return Response.json({ error: "id wpisu wagi jest wymagane." }, { status: 400 });

  await deleteWeightEntryFromPostgres(actorId, entryId);
  return Response.json({ deleted: true });
}