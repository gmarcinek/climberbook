import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  platformSocialErrorResponse,
  setWallPostLike,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    return Response.json(await setWallPostLike(actorId, id, true));
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    return Response.json(await setWallPostLike(actorId, id, false));
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
