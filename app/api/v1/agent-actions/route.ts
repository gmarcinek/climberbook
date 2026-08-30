import {
  createAgentActionInPostgres,
  getTrainingFromPostgres,
  listAgentActionsFromPostgres,
  listTrainingSummariesFromPostgres,
} from "@/lib/server/climberbook-repository";
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

  const body: unknown = await request.json().catch(() => null);
  const trainingId =
    body &&
    typeof body === "object" &&
    typeof (body as { trainingId?: unknown }).trainingId === "string"
      ? (body as { trainingId: string }).trainingId.trim()
      : "";
  if (!trainingId)
    return Response.json(
      { error: "trainingId jest wymagane." },
      { status: 400 },
    );

  const [training, actions, summaries] = await Promise.all([
    getTrainingFromPostgres(actorId, trainingId),
    listAgentActionsFromPostgres(actorId),
    listTrainingSummariesFromPostgres(actorId),
  ]);
  if (
    summaries.some(
      (summary) =>
        summary.scope === "training" && summary.trainingId === training.id,
    )
  ) {
    return Response.json({ status: "already_summarized" });
  }
  const existingAction = actions.find(
    (action) =>
      action.kind === "summarize_training" &&
      action.status === "todo" &&
      action.details.trainingId === training.id,
  );
  if (existingAction) {
    return Response.json({ status: "already_queued", action: existingAction });
  }

  const action = await createAgentActionInPostgres(actorId, {
    kind: "summarize_training",
    title: `Podsumuj trening: ${training.date} ${training.time}`,
    details: { trainingId: training.id },
  });
  return Response.json({ status: "queued", action }, { status: 201 });
}
