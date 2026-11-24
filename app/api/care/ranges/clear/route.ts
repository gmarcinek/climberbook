import {
  CareEventValidationError,
  clearCareRange,
} from "@/lib/server/care-event-range-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    return Response.json(await clearCareRange(actorId, await request.json()));
  } catch (error) {
    if (error instanceof CareEventValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Care range clear failed", error);
    return Response.json(
      { error: "Nie udało się usunąć opieki." },
      { status: 500 },
    );
  }
}
