import {
  createExperimentalUser,
  listExperimentalUsers,
} from "@/lib/server/climberbook-repository";
import {
  isPostgresExperimentalApiEnabled,
  postgresExperimentalApiDisabledResponse,
} from "@/lib/server/feature-flags";

export const runtime = "nodejs";

export async function GET() {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const users = await listExperimentalUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  if (!isPostgresExperimentalApiEnabled())
    return postgresExperimentalApiDisabledResponse();

  const input = await request.json();
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const displayName =
    typeof input.displayName === "string" ? input.displayName.trim() : "";

  if (!email || !displayName) {
    return Response.json(
      { error: "email i displayName są wymagane." },
      { status: 400 },
    );
  }

  const user = await createExperimentalUser({ email, displayName });
  return Response.json({ user }, { status: 201 });
}