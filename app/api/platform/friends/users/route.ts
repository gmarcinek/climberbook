import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import { listPlatformUsers } from "@/lib/server/platform-social-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const query = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json({ users: await listPlatformUsers(actorId, query) });
}
