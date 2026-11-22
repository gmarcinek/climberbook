import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  deleteWallComment,
  platformSocialErrorResponse,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id, commentId } = await context.params;

  try {
    await deleteWallComment(actorId, id, commentId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
