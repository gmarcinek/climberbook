import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  listPlatformRelationships,
  listPlatformNotifications,
  platformSocialErrorResponse,
  sendFriendRequest,
} from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const [relationships, notifications] = await Promise.all([
    listPlatformRelationships(actorId),
    listPlatformNotifications(actorId),
  ]);
  return Response.json({ relationships, notifications });
}

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  try {
    return Response.json(
      { relationship: await sendFriendRequest(actorId, await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return platformSocialErrorResponse(error);
  }
}
