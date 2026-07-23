import {
  createFacilityInPostgres,
  deleteFacilityFromPostgres,
  listFacilitiesFromPostgres,
  updateFacilityInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

function getName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getActor(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  return getExperimentalActorId(request);
}

export async function GET(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  return Response.json({ facilities: await listFacilitiesFromPostgres(actorId) });
}

export async function POST(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const name = getName((await request.json()).name);
  if (!name) return Response.json({ error: "name jest wymagane." }, { status: 400 });

  return Response.json(
    { facility: await createFacilityInPostgres(actorId, name) },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  const facilityId = typeof input.id === "string" ? input.id : "";
  const name = getName(input.name);
  if (!facilityId || !name)
    return Response.json({ error: "id i name są wymagane." }, { status: 400 });

  return Response.json({
    facility: await updateFacilityInPostgres(actorId, facilityId, name),
  });
}

export async function DELETE(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const facilityId = new URL(request.url).searchParams.get("id");
  if (!facilityId) return Response.json({ error: "id jest wymagane." }, { status: 400 });

  await deleteFacilityFromPostgres(actorId, facilityId);
  return Response.json({ deleted: true });
}