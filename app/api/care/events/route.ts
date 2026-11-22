import {
  CareEventValidationError,
  createCareEventsFromProjection,
  deleteProjectedCareEvent,
  listCareEvents,
} from "@/lib/server/care-event-range-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof CareEventValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("Care events API failed", error);
  return Response.json(
    { error: "Nie udało się przetworzyć wydarzeń kalendarza." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  try {
    const url = new URL(request.url);
    const events = await listCareEvents(
      actorId,
      url.searchParams.get("groupId") ?? undefined,
      url.searchParams.get("type") ?? undefined,
    );
    return Response.json({ events });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  try {
    const events = await createCareEventsFromProjection(
      actorId,
      await request.json(),
    );
    return Response.json({ events }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const date = url.searchParams.get("date");
  if (!id || !date) {
    return Response.json(
      { error: "ID i data wydarzenia są wymagane." },
      { status: 400 },
    );
  }

  try {
    await deleteProjectedCareEvent(actorId, id, date);
    return Response.json({ events: await listCareEvents(actorId) });
  } catch (error) {
    return errorResponse(error);
  }
}
