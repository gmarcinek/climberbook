import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  createWallPost,
  listWallPosts,
  platformSocialErrorResponse,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  return Response.json({ posts: await listWallPosts(actorId) });
}

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  try {
    return Response.json(
      { post: await createWallPost(actorId, await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
