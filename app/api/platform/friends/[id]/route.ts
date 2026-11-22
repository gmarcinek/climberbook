import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  platformSocialErrorResponse,
  updatePlatformRelationship,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    const relationship = await updatePlatformRelationship(
      actorId,
      id,
      await request.json(),
    );
    if (!relationship) return new Response(null, { status: 204 });
    return Response.json({ relationship });
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
