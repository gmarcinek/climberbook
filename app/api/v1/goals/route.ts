import type { GoalRecord } from "@/lib/climbs-db";
import {
  createGoalInPostgres,
  deleteGoalFromPostgres,
  updateGoalInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

const goalKinds = new Set<GoalRecord["kind"]>([
  "weight",
  "training_count",
  "route_grade",
  "aerobic_coin",
  "strength_coin",
]);
const goalStatuses = new Set<GoalRecord["status"]>([
  "active",
  "completed",
  "archived",
]);

function isGoalInput(
  value: unknown,
): value is Omit<GoalRecord, "id" | "createdAt" | "updatedAt"> {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.athleteId === "string" &&
    goalKinds.has(input.kind as GoalRecord["kind"]) &&
    typeof input.title === "string" &&
    input.title.trim().length >= 3 &&
    typeof input.targetValue === "number" &&
    Number.isFinite(input.targetValue) &&
    input.targetValue > 0 &&
    typeof input.startDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(input.startDate) &&
    (input.endDate === undefined ||
      (typeof input.endDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(input.endDate))) &&
    (typeof input.endDate !== "string" || input.endDate >= input.startDate) &&
    (input.status === undefined ||
      goalStatuses.has(input.status as GoalRecord["status"])) &&
    (input.kind !== "route_grade" ||
      (typeof input.targetGrade === "string" &&
        input.targetGrade.trim().length > 0))
  );
}

function invalidGoalResponse() {
  return Response.json(
    {
      error:
        "Wymagane są poprawne dane celu: athleteId, kind, title, targetValue i startDate.",
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const input: unknown = await request.json();
  if (!isGoalInput(input)) return invalidGoalResponse();
  const goal = await createGoalInPostgres(actorId, {
    ...input,
    status: input.status ?? "active",
  });
  return Response.json({ goal }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const input: unknown = await request.json();
  if (!isGoalInput(input) || typeof (input as { id?: unknown }).id !== "string")
    return invalidGoalResponse();
  const goal = await updateGoalInPostgres(actorId, {
    ...(input as GoalRecord),
    id: (input as GoalRecord).id,
    status: input.status ?? "active",
  });
  return Response.json({ goal });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return Response.json({ error: "id celu jest wymagane." }, { status: 400 });
  return Response.json(await deleteGoalFromPostgres(actorId, id));
}
