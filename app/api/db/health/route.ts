import { checkDatabase } from "@/lib/server/climberbook-repository";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function GET() {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const databaseOk = await checkDatabase();

  return Response.json({
    status: databaseOk ? "ok" : "error",
    database: databaseOk ? "ok" : "error",
    timestamp: new Date().toISOString(),
  }, { status: databaseOk ? 200 : 503 });
}