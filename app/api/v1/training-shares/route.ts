import {
  createPublicTrainingShareInPostgres,
  savePublicTrainingShareImageInPostgres,
} from "@/lib/server/climberbook-repository";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json().catch(() => null);
  const trainingId =
    input &&
    typeof input === "object" &&
    typeof (input as { trainingId?: unknown }).trainingId === "string"
      ? (input as { trainingId: string }).trainingId
      : "";
  const stimulusLabel =
    input &&
    typeof input === "object" &&
    typeof (input as { stimulusLabel?: unknown }).stimulusLabel === "string"
      ? (input as { stimulusLabel: string }).stimulusLabel.trim().slice(0, 72)
      : undefined;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trainingId,
    )
  ) {
    return Response.json(
      { error: "Wymagany jest poprawny identyfikator treningu." },
      { status: 400 },
    );
  }

  const share = await createPublicTrainingShareInPostgres(
    actorId,
    trainingId,
    stimulusLabel || undefined,
  );
  return Response.json({ shareId: share.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const input: unknown = await request.json().catch(() => null);
  const shareId =
    input &&
    typeof input === "object" &&
    typeof (input as { shareId?: unknown }).shareId === "string"
      ? (input as { shareId: string }).shareId
      : "";
  const imageBase64 =
    input &&
    typeof input === "object" &&
    typeof (input as { imageBase64?: unknown }).imageBase64 === "string"
      ? (input as { imageBase64: string }).imageBase64
      : "";
  if (!/^[A-Za-z0-9_-]{12}$/.test(shareId) || !imageBase64) {
    return Response.json(
      { error: "Wymagany jest link i obraz JPEG." },
      { status: 400 },
    );
  }

  const imageData = Buffer.from(imageBase64, "base64");
  if (
    !imageData.length ||
    imageData.length > 5 * 1024 * 1024 ||
    imageData[0] !== 0xff ||
    imageData[1] !== 0xd8
  ) {
    return Response.json(
      { error: "Obraz musi być JPEG do 5 MB." },
      { status: 400 },
    );
  }
  await savePublicTrainingShareImageInPostgres(actorId, shareId, imageData);
  return Response.json({ saved: true });
}
