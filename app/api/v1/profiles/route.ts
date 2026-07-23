import {
  getUserProfileFromPostgres,
  saveUserProfileToPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

function missingAthleteIdResponse() {
  return Response.json({ error: "athleteId jest wymagane." }, { status: 400 });
}

export async function GET(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const athleteId = new URL(request.url).searchParams.get("athleteId");
  if (!athleteId) return missingAthleteIdResponse();

  const profile = await getUserProfileFromPostgres(actorId, athleteId);
  return Response.json({ profile });
}

export async function PUT(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input = await request.json();
  if (typeof input.athleteId !== "string" || !input.athleteId) {
    return missingAthleteIdResponse();
  }

  const profile = await saveUserProfileToPostgres(actorId, {
    athleteId: input.athleteId,
    birthDate: typeof input.birthDate === "string" ? input.birthDate : "",
    sex: input.sex ?? "",
    heightCm: typeof input.heightCm === "number" ? input.heightCm : null,
    weightKg: typeof input.weightKg === "number" ? input.weightKg : null,
  });

  return Response.json({ profile });
}