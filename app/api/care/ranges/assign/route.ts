import {
  CareEventValidationError,
  assignCareDates,
} from "@/lib/server/care-event-range-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    return Response.json({
      events: await assignCareDates(actorId, await request.json()),
    });
  } catch (error) {
    if (error instanceof CareEventValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("Care range assign failed", error);
    return Response.json(
      { error: "Nie udało się zapisać opieki." },
      { status: 500 },
    );
  }
}
