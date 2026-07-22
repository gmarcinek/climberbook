import {
  createAthleteInPostgres,
  listAthletesFromPostgres,
} from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

export async function GET() {
  const athletes = await listAthletesFromPostgres();

  return Response.json({ athletes });
}

export async function POST(request: Request) {
  const input = await request.json();
  const athlete = await createAthleteInPostgres(input);

  return Response.json({ athlete }, { status: 201 });
}