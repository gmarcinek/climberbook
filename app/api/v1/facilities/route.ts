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
import type {
  FacilityCapabilities,
  FacilityKind,
  TrainingSurface,
} from "@/lib/climbs-db";

export const runtime = "nodejs";

function getName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getLocation(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as {
    kind?: unknown;
    locationLabel?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  };
  const kinds: FacilityKind[] = ["indoor_wall", "crag", "crag_sector"];
  if (
    typeof input.kind !== "string" ||
    !kinds.includes(input.kind as FacilityKind)
  )
    return null;
  const latitude = input.latitude;
  const longitude = input.longitude;
  const hasCoordinates = latitude !== null && longitude !== null;
  if (
    (latitude !== null && typeof latitude !== "number") ||
    (longitude !== null && typeof longitude !== "number") ||
    (hasCoordinates &&
      (!Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180))
  )
    return null;
  return {
    kind: input.kind as FacilityKind,
    locationLabel: getName(input.locationLabel),
    latitude: latitude as number | null,
    longitude: longitude as number | null,
  };
}

const trainingSurfaces: TrainingSurface[] = [
  "lina",
  "baldy",
  "moon",
  "drazek",
  "spraywall",
  "kilter",
  "silownia",
  "chwytotablica",
  "campus",
  "bieznia",
  "rower",
  "bieg",
  "treking",
];
const ropeWallInclinations = [
  "slab",
  "vertical",
  "slight_overhang",
  "overhang",
  "steep",
];

function getCapabilities(value: unknown): FacilityCapabilities | null {
  if (!value || typeof value !== "object") return null;
  const input = value as { activities?: unknown; ropeWalls?: unknown };
  if (!Array.isArray(input.activities) || !Array.isArray(input.ropeWalls))
    return null;
  if (
    !input.activities.every(
      (activity): activity is TrainingSurface =>
        typeof activity === "string" &&
        trainingSurfaces.includes(activity as TrainingSurface),
    )
  )
    return null;
  if (
    !input.ropeWalls.every(
      (wall) =>
        wall &&
        typeof wall === "object" &&
        typeof (wall as { lengthMeters?: unknown }).lengthMeters === "number" &&
        Number.isFinite((wall as { lengthMeters: number }).lengthMeters) &&
        (wall as { lengthMeters: number }).lengthMeters > 0 &&
        ropeWallInclinations.includes(
          (wall as { inclination?: string }).inclination ?? "",
        ),
    )
  )
    return null;
  return {
    activities: input.activities as TrainingSurface[],
    ropeWalls: input.ropeWalls.map((wall, index) => {
      const profile = wall as {
        name?: unknown;
        lengthMeters: number;
        inclination: FacilityCapabilities["ropeWalls"][number]["inclination"];
      };
      return {
        name:
          typeof profile.name === "string" && profile.name.trim()
            ? profile.name.trim()
            : `Ściana ${index + 1}`,
        lengthMeters: profile.lengthMeters,
        inclination: profile.inclination,
      };
    }),
  };
}

async function getActor(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  return getExperimentalActorId(request);
}

export async function GET(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  return Response.json({
    facilities: await listFacilitiesFromPostgres(actorId),
  });
}

export async function POST(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  const name = getName(input.name);
  const capabilities = getCapabilities(input.capabilities);
  const location = getLocation(input);
  if (!name || !capabilities || !location)
    return Response.json(
      { error: "name, capabilities i poprawny typ obiektu są wymagane." },
      { status: 400 },
    );

  return Response.json(
    {
      facility: await createFacilityInPostgres(actorId, {
        name,
        capabilities,
        ...location,
      }),
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  const facilityId = typeof input.id === "string" ? input.id : "";
  const name = getName(input.name);
  const capabilities = getCapabilities(input.capabilities);
  const location = getLocation(input);
  if (!facilityId || !name || !capabilities || !location)
    return Response.json(
      { error: "id, name, capabilities i poprawny typ obiektu są wymagane." },
      { status: 400 },
    );

  return Response.json({
    facility: await updateFacilityInPostgres(actorId, facilityId, {
      name,
      capabilities,
      ...location,
    }),
  });
}

export async function DELETE(request: Request) {
  const actorId = await getActor(request);
  if (typeof actorId !== "string") return actorId;

  const facilityId = new URL(request.url).searchParams.get("id");
  if (!facilityId)
    return Response.json({ error: "id jest wymagane." }, { status: 400 });

  await deleteFacilityFromPostgres(actorId, facilityId);
  return Response.json({ deleted: true });
}
