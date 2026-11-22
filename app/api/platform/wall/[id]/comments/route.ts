import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  createWallComment,
  listWallComments,
  platformSocialErrorResponse,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    return Response.json({ comments: await listWallComments(id) });
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;

  try {
    return Response.json(
      { comment: await createWallComment(actorId, id, await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
