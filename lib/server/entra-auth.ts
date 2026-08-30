import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

type EntraClaims = JWTPayload & {
  oid?: unknown;
  tid?: unknown;
  scp?: unknown;
  email?: unknown;
  preferred_username?: unknown;
  upn?: unknown;
};

const jwksByMetadataUrl = new Map<
  string,
  ReturnType<typeof createRemoteJWKSet>
>();

function getRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}.`);
  return value;
}

function unauthorized(message: string) {
  return Response.json({ error: message }, { status: 401 });
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function getEmailClaim(payload: EntraClaims) {
  const email = [payload.email, payload.preferred_username, payload.upn].find(
    (value): value is string =>
      typeof value === "string" && value.includes("@"),
  );

  return email?.trim().toLowerCase() || null;
}

async function getJwks(metadataUrl: string) {
  const cachedJwks = jwksByMetadataUrl.get(metadataUrl);
  if (cachedJwks) return cachedJwks;

  const response = await fetch(metadataUrl);
  const metadata: unknown = await response.json();
  const jwksUri =
    metadata &&
    typeof metadata === "object" &&
    typeof (metadata as { jwks_uri?: unknown }).jwks_uri === "string"
      ? (metadata as { jwks_uri: string }).jwks_uri
      : null;

  if (!response.ok || !jwksUri?.startsWith("https://")) {
    throw new Error("Nieprawidłowy dokument OpenID Connect Entra.");
  }

  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksByMetadataUrl.set(metadataUrl, jwks);
  return jwks;
}

export async function getEntraTokenIdentity(
  request: Request,
): Promise<
  { provider: string; subject: string; email: string | null } | Response | null
> {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const tenantId = getRequiredEnvironment("ENTRA_TENANT_ID");
    const audience = getRequiredEnvironment("ENTRA_API_CLIENT_ID");
    const issuer =
      process.env.ENTRA_ISSUER?.trim() ||
      `https://login.microsoftonline.com/${tenantId}/v2.0`;
    const metadataUrl =
      process.env.ENTRA_OPENID_CONFIGURATION_URL?.trim() ||
      `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const requiredScope =
      process.env.ENTRA_REQUIRED_SCOPE?.trim() || "climberbook.access";
    const jwks = await getJwks(metadataUrl);
    const { payload } = await jwtVerify<EntraClaims>(token, jwks, {
      issuer,
      audience,
    });
    const objectId = typeof payload.oid === "string" ? payload.oid : null;
    const tokenTenantId = typeof payload.tid === "string" ? payload.tid : null;
    const scopes =
      typeof payload.scp === "string" ? payload.scp.split(" ") : [];

    if (
      !objectId ||
      tokenTenantId !== tenantId ||
      !scopes.includes(requiredScope)
    ) {
      return unauthorized(
        "Token Entra nie ma wymaganej tożsamości lub zakresu.",
      );
    }

    return {
      provider: `entra:${tenantId}`,
      subject: objectId,
      email: getEmailClaim(payload),
    };
  } catch {
    return unauthorized("Token Entra jest nieprawidłowy lub wygasł.");
  }
}
