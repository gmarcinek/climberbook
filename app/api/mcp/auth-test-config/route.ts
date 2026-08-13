import { getPublicOrigin } from "@/lib/server/public-url";

export const runtime = "nodejs";

function getRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}.`);
  return value;
}

export async function GET(request: Request) {
  try {
    const tenantId = getRequiredEnvironment("ENTRA_TENANT_ID");
    const issuer =
      process.env.ENTRA_ISSUER?.trim() ||
      `https://login.microsoftonline.com/${tenantId}/v2.0`;
    const metadataUrl =
      process.env.ENTRA_OPENID_CONFIGURATION_URL?.trim() ||
      `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const metadataResponse = await fetch(metadataUrl, { cache: "no-store" });
    const metadataText = await metadataResponse.text();
    let metadata: unknown = null;
    if (metadataText) {
      try {
        metadata = JSON.parse(metadataText);
      } catch {
        return Response.json(
          {
            error: `Entra zwróciła nieprawidłowe metadane OAuth (HTTP ${metadataResponse.status}).`,
          },
          { status: 502 },
        );
      }
    }

    const authorizationEndpoint =
      metadata &&
      typeof metadata === "object" &&
      typeof (metadata as { authorization_endpoint?: unknown })
        .authorization_endpoint === "string"
        ? (metadata as { authorization_endpoint: string })
            .authorization_endpoint
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
  } catch (caught) {
    return Response.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Nie udało się przygotować konfiguracji Entra OAuth.",
      },
      { status: 500 },
    );
  }
}
