import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  carePhotoErrorResponse,
  listCarePhotos,
  updateCarePhotos,
  uploadCarePhotos,
} from "@/lib/server/care-photos-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  const params = new URL(request.url).searchParams;
  try {
    return Response.json({
      photos: await listCarePhotos(actorId, {
        status: params.get("status"),
        groupId: params.get("groupId"),
        start: params.get("start"),
        end: params.get("end"),
      }),
    });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}

// multipart/form-data: files[] plus optional groupId, description and takenDates[] (one per file).
export async function POST(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    const photos = await uploadCarePhotos(actorId, files, {
      groupId: form.get("groupId"),
      description: form.get("description"),
      takenDates: form.getAll("takenDates"),
      metadata: form.getAll("metadata"),
    });
    return Response.json({ photos }, { status: 201 });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}

// Bulk update, e.g. confirming every photo from the waiting room at once.
export async function PATCH(request: Request) {
  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string")
      : [];
    const { ids: _ids, ...changes } = body;
    return Response.json({ photos: await updateCarePhotos(actorId, ids, changes) });
  } catch (error) {
    return carePhotoErrorResponse(error);
  }
}
