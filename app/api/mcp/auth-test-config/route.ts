import { getPublicOrigin } from "@/lib/server/public-url";

export const runtime = "nodejs";

function getRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}.`);
  return value;
}

export async function GET(request: Request) {
  const metadataUrl = getRequiredEnvironment("ENTRA_OPENID_CONFIGURATION_URL");
  const metadataResponse = await fetch(metadataUrl, { cache: "no-store" });
  const metadata: unknown = await metadataResponse.json();

  const authorizationEndpoint =
    metadata &&
    typeof metadata === "object" &&
    typeof (metadata as { authorization_endpoint?: unknown })
      .authorization_endpoint === "string"
      ? (metadata as { authorization_endpoint: string }).authorization_endpoint
      : null;
  const tokenEndpoint =
    metadata &&
    typeof metadata === "object" &&
    typeof (metadata as { token_endpoint?: unknown }).token_endpoint ===
      "string"
      ? (metadata as { token_endpoint: string }).token_endpoint
      : null;

  if (!metadataResponse.ok || !authorizationEndpoint || !tokenEndpoint) {
    return Response.json(
      { error: "Nie udało się odczytać konfiguracji Entra OAuth." },
      { status: 502 },
    );
  }

  const apiClientId = getRequiredEnvironment("ENTRA_API_CLIENT_ID");
  const oauthClientId = getRequiredEnvironment("ENTRA_MCP_CLIENT_ID");
  const scope =
    process.env.ENTRA_REQUIRED_SCOPE?.trim() || "climberbook.access";
  const apiResource =
    process.env.ENTRA_API_RESOURCE?.trim() || `api://${apiClientId}`;

  return Response.json({
    authorizationEndpoint,
    tokenEndpoint,
    clientId: oauthClientId,
    redirectUri: `${getPublicOrigin(request)}/mcp-auth-test`,
    scope: `openid profile offline_access ${apiResource}/${scope}`,
  });
}
