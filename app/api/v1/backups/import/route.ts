import type { ClimberbookFullDatabaseBackup } from "@/lib/climbs-db";
import { importFullBackupToPostgres } from "@/lib/server/climberbook-repository";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";
import { getExperimentalActorId } from "@/lib/server/experimental-actor";

export const runtime = "nodejs";

function isFullBackup(value: unknown): value is ClimberbookFullDatabaseBackup {
  if (!value || typeof value !== "object") return false;

  const backup = value as Record<string, unknown>;

  return (
    backup.formatVersion === 3 &&
    Array.isArray(backup.athletes) &&
    Array.isArray(backup.sections) &&
    Array.isArray(backup.facilities) &&
    Array.isArray(backup.climbs) &&
    Array.isArray(backup.trainings) &&
    Array.isArray(backup.ascents) &&
    Array.isArray(backup.profiles) &&
    Array.isArray(backup.weightEntries)
  );
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const actorId = await getExperimentalActorId(request);
  if (typeof actorId !== "string") return actorId;

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();

  if (!idempotencyKey) {
    return Response.json(
      { error: "Nagłówek Idempotency-Key jest wymagany." },
      { status: 400 },
    );
  }

  try {
    const backup: unknown = await request.json();

    if (!isFullBackup(backup)) {
      return Response.json(
        { error: "Wymagany jest pełny backup w formacie 3." },
        { status: 400 },
      );
    }

    const result = await importFullBackupToPostgres(
      backup,
      idempotencyKey,
      actorId,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Import backupu do PostgreSQL nie powiódł się.",
      },
      { status: 500 },
    );
  }
}