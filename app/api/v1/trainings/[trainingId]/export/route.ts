import { exportPostgresTrainingBackup } from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ trainingId: string }> },
) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const { trainingId } = await context.params;
  const backup = await exportPostgresTrainingBackup(actorId, trainingId);

  if (!backup) {
    return Response.json({ error: "Nie znaleziono treningu." }, { status: 404 });
  }

  const training = backup.trainings[0]!;
  const filename = `climberbook-trening-${training.date}-${training.time.replaceAll(":", "-")}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}