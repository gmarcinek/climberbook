import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  acceptPhotoTerms,
  carePhotoErrorResponse,
  hasPhotoConsent,
  PHOTO_TERMS_VERSION,
} from "@/lib/server/care-photos-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    return Response.json({
      accepted: await hasPhotoConsent(actorId),
      termsVersion: PHOTO_TERMS_VERSION,
    });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    const body = (await request.json()) as { termsVersion?: unknown };
    await acceptPhotoTerms(actorId, body.termsVersion);
    return Response.json({ accepted: true, termsVersion: PHOTO_TERMS_VERSION });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}
