import { checkDatabase } from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

export async function GET() {
  const databaseOk = await checkDatabase();

  return Response.json({
    status: databaseOk ? "ok" : "error",
    database: databaseOk ? "ok" : "error",
    timestamp: new Date().toISOString(),
  }, { status: databaseOk ? 200 : 503 });
}