import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  deleteWallPost,
  platformSocialErrorResponse,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    await deleteWallPost(actorId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
