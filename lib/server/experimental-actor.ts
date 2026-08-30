import {
  getOrCreateLocalDevelopmentUserId,
  findUserIdByAuthIdentity,
  linkExistingUserToAuthIdentity,
  requireExperimentalUser,
} from "@/lib/server/climberbook-repository";
import { getEntraTokenIdentity } from "@/lib/server/entra-auth";
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
  const entraActorId = await getEntraActorId(request);
  if (typeof entraActorId === "string" || entraActorId instanceof Response)
    return entraActorId;

  if (isSocialLoginConfigured()) {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;

    if (sessionUserId) {
      try {
        await requireExperimentalUser(sessionUserId);
        return sessionUserId;
      } catch {
        return Response.json(
          { error: "Sesja użytkownika jest nieprawidłowa." },
          { status: 401 },
        );
      }
    }

    return Response.json(
      { error: "Wymagane jest zalogowanie." },
      { status: 401 },
    );
  }

  if (process.env.CLIMBERBOOK_ENV === "local") {
    return getOrCreateLocalDevelopmentUserId();
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

export async function getEntraActorId(
  request: Request,
): Promise<string | Response | null> {
  const identity = await getEntraTokenIdentity(request);
  if (identity === null || identity instanceof Response) return identity;

  const userId = await findUserIdByAuthIdentity(identity);
  if (userId) return userId;

  const email = identity.email;
  if (!email) {
    return Response.json(
      {
        error:
          "Konto Entra nie jest przypisane do użytkownika Climberbook i nie zawiera e-maila do jednorazowego dopasowania.",
      },
      { status: 403 },
    );
  }

  const linkedUserId = await linkExistingUserToAuthIdentity({
    provider: identity.provider,
    subject: identity.subject,
    email,
  });
  if (!linkedUserId) {
    return Response.json(
      { error: "Konto Entra nie jest przypisane do użytkownika Climberbook." },
      { status: 403 },
    );
  }

  return linkedUserId;
}
