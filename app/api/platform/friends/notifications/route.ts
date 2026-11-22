import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import { listPlatformNotifications } from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  return Response.json({
    notifications: await listPlatformNotifications(actorId),
  });
}
