import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  carePhotoErrorResponse,
  deleteCarePhoto,
  getCarePhotoImage,
  updateCarePhotos,
} from "@/lib/server/care-photos-repository";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;
  try {
    const image = await getCarePhotoImage(actorId, id);
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const [photo] = await updateCarePhotos(actorId, [id], body);
    if (!photo) return new Response(null, { status: 404 });
    return Response.json({ photo });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const { id } = await context.params;
  try {
    await deleteCarePhoto(actorId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}
