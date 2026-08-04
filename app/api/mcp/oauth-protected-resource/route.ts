export const runtime = "nodejs";

function getRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Brak wymaganej zmiennej środowiskowej ${name}.`);
  return value;
}

export function GET(request: Request) {
  const apiClientId = getRequiredEnvironment("ENTRA_API_CLIENT_ID");
  const authorizationServer = getRequiredEnvironment("ENTRA_ISSUER");
  const scope =
    process.env.ENTRA_REQUIRED_SCOPE?.trim() || "climberbook.access";
  const apiResource =
    process.env.ENTRA_API_RESOURCE?.trim() || `api://${apiClientId}`;

  return Response.json({
    resource: apiResource,
    authorization_servers: [authorizationServer],
    scopes_supported: [`${apiResource}/${scope}`],
  });
}
