import { requireExperimentalUser } from "@/lib/server/climberbook-repository";
import { getServerSession } from "next-auth";
import {
  authOptions,
  isSocialLoginConfigured,
} from "@/lib/server/auth-options";

const EXPERIMENTAL_USER_HEADER = "X-Climberbook-User-Id";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getExperimentalActorId(
  request: Request,
): Promise<string | Response> {
  if (isSocialLoginConfigured()) {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;

    if (sessionUserId) {
      try {
        await requireExperimentalUser(sessionUserId);
        return sessionUserId;
      } catch {
        return Response.json({ error: "Sesja użytkownika jest nieprawidłowa." }, { status: 401 });
      }
    }

    return Response.json({ error: "Wymagane jest zalogowanie." }, { status: 401 });
  }

  const userId = request.headers.get(EXPERIMENTAL_USER_HEADER)?.trim();

  if (!userId || !isUuid(userId)) {
    return Response.json(
      { error: `Wymagany jest nagłówek ${EXPERIMENTAL_USER_HEADER} z UUID.` },
      { status: 401 },
    );
  }

  try {
    await requireExperimentalUser(userId);
    return userId;
  } catch {
    return Response.json(
      { error: "Nie znaleziono użytkownika eksperymentalnego." },
      { status: 401 },
    );
  }
}