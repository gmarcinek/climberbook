import {
  createAscentInPostgres,
  deleteAscentFromPostgres,
  listAscentsFromPostgres,
  updateAscentInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

type AscentInput = {
  athleteId: string;
  date: string;
  source: "panel" | "skala";
  importSource?: "8a.nu";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  style?: string;
  notes: string;
};

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

function hasNumericId(value: unknown): value is { id: number } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Number.isInteger((value as { id?: unknown }).id)
  );
}

function invalidAscentResponse() {
  return Response.json(
    { error: "Nieprawidłowe dane przejścia." },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return invalidAscentResponse();

  const ascents = await listAscentsFromPostgres(actorId, athleteId);
  return Response.json({ ascents });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isAscentInput(input)) return invalidAscentResponse();

  const ascent = await createAscentInPostgres(actorId, input);
  return Response.json({ ascent }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json();
  if (!isAscentInput(input) || !hasNumericId(input))
    return invalidAscentResponse();

  const ascent = await updateAscentInPostgres(actorId, {
    ...input,
    id: input.id,
  });
  return Response.json({ ascent });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const ascentId = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(ascentId) || ascentId < 1)
    return Response.json({ error: "id przejścia jest wymagane." }, { status: 400 });

  await deleteAscentFromPostgres(actorId, ascentId);
  return Response.json({ deleted: true });
}