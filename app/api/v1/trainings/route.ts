import {
  createTrainingInPostgres,
  listTrainingsFromPostgres,
} from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const athleteId = url.searchParams.get("athleteId") ?? undefined;
  const trainings = await listTrainingsFromPostgres(athleteId);

  return Response.json({ trainings });
}

export async function POST(request: Request) {
  const input = await request.json();
  const training = await createTrainingInPostgres(input);

  return Response.json({ training }, { status: 201 });
}