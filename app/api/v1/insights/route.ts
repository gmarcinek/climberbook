import {
  deleteAgentFeedItemFromPostgres,
  deleteTrainingSummaryFromPostgres,
  listAgentFeedItemsFromPostgres,
  listTrainingSummariesFromPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const [feedItems, summaries] = await Promise.all([
    listAgentFeedItemsFromPostgres(actorId),
    listTrainingSummariesFromPostgres(actorId),
  ]);
  return Response.json({ feedItems, summaries });
}

export async function DELETE(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const body: unknown = await request.json().catch(() => null);
  const itemId =
    body &&
    typeof body === "object" &&
    typeof (body as { itemId?: unknown }).itemId === "string"
      ? (body as { itemId: string }).itemId.trim()
      : "";
  const itemType =
    body &&
    typeof body === "object" &&
    typeof (body as { itemType?: unknown }).itemType === "string"
      ? (body as { itemType: string }).itemType
      : "";
  if (!itemId || (itemType !== "summary" && itemType !== "feed")) {
    return Response.json(
      { error: "itemId oraz itemType (summary albo feed) są wymagane." },
      { status: 400 },
    );
  }

  const deleted =
    itemType === "summary"
      ? await deleteTrainingSummaryFromPostgres(actorId, itemId)
      : await deleteAgentFeedItemFromPostgres(actorId, itemId);
  return Response.json(deleted);
}
