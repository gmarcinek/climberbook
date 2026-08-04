import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getPostgresDatabaseSnapshot } from "@/lib/server/climberbook-repository";
import { getEntraActorId } from "@/lib/server/experimental-actor";
import { getPublicOrigin } from "@/lib/server/public-url";

export const runtime = "nodejs";

function mcpUnauthorizedResponse(
  request: Request,
  message: string,
  response?: Response,
) {
  const headers = new Headers(response?.headers);
  const metadataUrl = `${getPublicOrigin(request)}/.well-known/oauth-protected-resource`;
  headers.set(
    "WWW-Authenticate",
    `Bearer resource_metadata="${metadataUrl}", error="invalid_token", error_description="${message}"`,
  );

  return response
    ? new Response(response.body, { status: 401, headers })
    : Response.json({ error: message }, { status: 401, headers });
}

function createOAuthChallenge(request: Request) {
  const metadataUrl = `${getPublicOrigin(request)}/.well-known/oauth-protected-resource`;
  return `Bearer resource_metadata="${metadataUrl}", error="invalid_token", error_description="Zaloguj się, aby uzyskać dostęp do danych Climberbook."`;
}

function createServer(request: Request) {
  const server = new Server(
    { name: "climberbook", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } },
  );
  const apiClientId = process.env.ENTRA_API_CLIENT_ID?.trim() ?? "";
  const requiredScope =
    process.env.ENTRA_REQUIRED_SCOPE?.trim() || "climberbook.access";
  const apiResource =
    process.env.ENTRA_API_RESOURCE?.trim() || `api://${apiClientId}`;

  server.setRequestHandler(
    ListToolsRequestSchema,
    async () =>
      ({
        tools: [
          {
            name: "get_climbing_snapshot",
            title: "Pobierz dane wspinaczkowe",
            description:
              "Używaj automatycznie, gdy użytkownik pyta o swoje treningi wspinaczkowe, przejścia, profil, pomiary lub postępy. Zwraca pełny, prywatny snapshot danych zalogowanego użytkownika.",
            inputSchema: { type: "object", properties: {} },
            annotations: {
              readOnlyHint: true,
              openWorldHint: false,
              destructiveHint: false,
            },
            securitySchemes: [
              {
                type: "oauth2",
                scopes: [`${apiResource}/${requiredScope}`],
              },
            ],
          },
        ],
      }) as never,
  );

  server.setRequestHandler(CallToolRequestSchema, async (requestMessage) => {
    if (requestMessage.params.name !== "get_climbing_snapshot") {
      return {
        content: [{ type: "text", text: "Nieznane narzędzie MCP." }],
        isError: true,
      };
    }

    const actorId = await getEntraActorId(request);
    if (actorId instanceof Response) {
      const body: unknown = await actorId.json().catch(() => null);
      const message =
        body &&
        typeof body === "object" &&
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : "Nie udało się zweryfikować konta Entra.";
      return {
        content: [{ type: "text", text: message }],
        isError: true,
        _meta:
          actorId.status === 401
            ? { "mcp/www_authenticate": [createOAuthChallenge(request)] }
            : undefined,
      };
    }

    if (actorId === null) {
      return {
        content: [
          {
            type: "text",
            text: "Wymagane jest zalogowanie przez Entra External ID.",
          },
        ],
        isError: true,
        _meta: { "mcp/www_authenticate": [createOAuthChallenge(request)] },
      };
    }

    const snapshot = await getPostgresDatabaseSnapshot(actorId);
    return {
      content: [{ type: "text", text: JSON.stringify(snapshot) }],
    };
  });

  return server;
}

async function handleMcpRequest(request: Request) {
  const server = createServer(request);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
