import type { AscentRecord } from "@/lib/climbs-db";
import {
  deleteAscentsByImportSourceFromPostgres,
  importAscentsToPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

type AscentInput = Omit<AscentRecord, "id" | "createdAt">;
type AscentUpdateInput = AscentInput & Required<Pick<AscentRecord, "id">>;

function isAscentInput(value: unknown): value is AscentInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Record<string, unknown>;

  return (
    typeof input.athleteId === "string" &&
    typeof input.date === "string" &&
    (input.source === "panel" || input.source === "skala") &&
    typeof input.routeName === "string" &&
    typeof input.suggestedGrade === "string" &&
    typeof input.subjectiveGrade === "string" &&
    typeof input.notes === "string"
  );
}

function isAscentUpdateInput(value: unknown): value is AscentUpdateInput {
  const id = (value as Record<string, unknown> | null)?.id;

  return (
    isAscentInput(value) &&
    typeof id === "number" &&
    Number.isInteger(id) &&
    id > 0
  );
}

function isImportInput(
  value: unknown,
): value is { create: AscentInput[]; update: AscentUpdateInput[] } {
  if (!value || typeof value !== "object") return false;

  const input = value as Record<string, unknown>;
  return (
    Array.isArray(input.create) &&
    input.create.every(isAscentInput) &&
    Array.isArray(input.update) &&
    input.update.every(isAscentUpdateInput)
  );
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isImportInput(input)) {
    return Response.json(
      { error: "Nieprawidłowe dane importu przejść." },
      { status: 400 },
    );
  }

  const result = await importAscentsToPostgres(actorId, input);
  return Response.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) {
    return Response.json({ error: "Identyfikator zawodnika jest wymagany." }, { status: 400 });
  }

  const deletedCount = await deleteAscentsByImportSourceFromPostgres(
    actorId,
    athleteId,
    "8a.nu",
  );
  return Response.json({ deletedCount });
}