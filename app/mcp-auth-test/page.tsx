"use client";

import { useEffect, useState } from "react";
import styles from "../PublicInfo.module.css";

type OAuthConfig = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
};

type ToolCheck = {
  name: string;
  status: "passed" | "failed" | "skipped";
  details: string;
};

type ToolResponse = {
  id: number;
  name: string;
  body: unknown;
};

const stateKey = "climberbook-mcp-auth-state";
const verifierKey = "climberbook-mcp-auth-verifier";
const pendingTestTrainingKey = "climberbook-mcp-save-test-training";
const pendingTestTrainingSummaryKey = "climberbook-mcp-summarize-test-training";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomValue() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(verifier: string) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function getTokenObjectId(accessToken: string) {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims: unknown = JSON.parse(json);
    return claims &&
      typeof claims === "object" &&
      typeof (claims as { oid?: unknown }).oid === "string"
      ? (claims as { oid: string }).oid
      : null;
  } catch {
    return null;
  }
}

function getMcpToolText(body: unknown) {
  const result =
    body &&
    typeof body === "object" &&
    "result" in body &&
    (body as { result?: unknown }).result &&
    typeof (body as { result?: unknown }).result === "object"
      ? (
          body as {
            result: {
              content?: Array<{ text?: unknown }>;
              isError?: unknown;
            };
          }
        ).result
      : null;
  const text = result?.content?.[0]?.text;
  if (result?.isError === true) {
    throw new Error(typeof text === "string" ? text : "MCP zwróciło błąd.");
  }
  if (typeof text !== "string") {
    throw new Error("MCP nie zwróciło tekstowej zawartości narzędzia.");
  }
  return text;
}

export default function McpAuthTestPage() {
  const [status, setStatus] = useState("Gotowe do logowania Entra.");
  const [objectId, setObjectId] = useState<string | null>(null);
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [readToolChecks, setReadToolChecks] = useState<ToolCheck[]>([]);
  const [readToolResponses, setReadToolResponses] = useState<ToolResponse[]>(
    [],
  );
  const [result, setResult] = useState<unknown>(null);

  async function getConfig() {
    const response = await fetch("/api/mcp/auth-test-config", {
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(
          `Konfiguracja OAuth zwróciła nieprawidłową odpowiedź (HTTP ${response.status}): ${text}`,
        );
      }
    }
    if (!response.ok) {
      throw new Error(
        body && typeof body === "object" && "error" in body
          ? String(body.error)
          : `Nie udało się odczytać konfiguracji OAuth (HTTP ${response.status}${text ? "" : "; pusta odpowiedź"}).`,
      );
    }
    return body as OAuthConfig;
  }

  async function signIn() {
    try {
      const config = await getConfig();
      const state = randomValue();
      const verifier = randomValue();
      const challenge = await pkceChallenge(verifier);
      sessionStorage.setItem(stateKey, state);
      sessionStorage.setItem(verifierKey, verifier);

      const url = new URL(config.authorizationEndpoint);
      url.search = new URLSearchParams({
        client_id: config.clientId,
        response_type: "code",
        redirect_uri: config.redirectUri,
        response_mode: "query",
        scope: config.scope,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
      }).toString();
      window.location.assign(url);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Błąd logowania.");
    }
  }

  function saveApprovedTestTraining() {
    sessionStorage.setItem(pendingTestTrainingKey, "true");
    void signIn();
  }

  function summarizeApprovedTestTraining() {
    sessionStorage.setItem(pendingTestTrainingSummaryKey, "true");
    void signIn();
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const state = search.get("state");
    if (!code || !state) return;

    const expectedState = sessionStorage.getItem(stateKey);
    const verifier = sessionStorage.getItem(verifierKey);
    const shouldSaveTestTraining =
      sessionStorage.getItem(pendingTestTrainingKey) === "true";
    const shouldSummarizeTestTraining =
      sessionStorage.getItem(pendingTestTrainingSummaryKey) === "true";
    if (state !== expectedState || !verifier) {
      setStatus("Nieprawidłowy stan odpowiedzi OAuth. Spróbuj ponownie.");
      return;
    }

    void (async () => {
      try {
        setStatus("Wymieniam kod Entra na token dostępu...");
        const config = await getConfig();
        const tokenResponse = await fetch(config.tokenEndpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: config.clientId,
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
            code_verifier: verifier,
          }),
        });
        const tokenText = await tokenResponse.text();
        let tokenBody: unknown = null;
        if (tokenText) {
          try {
            tokenBody = JSON.parse(tokenText);
          } catch {
            throw new Error(
              `Entra zwróciła nieprawidłową odpowiedź tokenu (HTTP ${tokenResponse.status}): ${tokenText}`,
            );
          }
        }
        const accessToken =
          tokenBody &&
          typeof tokenBody === "object" &&
          typeof (tokenBody as { access_token?: unknown }).access_token ===
            "string"
            ? (tokenBody as { access_token: string }).access_token
            : null;
        if (!tokenResponse.ok || !accessToken) {
          const oauthError =
            tokenBody &&
            typeof tokenBody === "object" &&
            typeof (tokenBody as { error?: unknown }).error === "string"
              ? (tokenBody as { error: string }).error
              : "token_error";
          const description =
            tokenBody &&
            typeof tokenBody === "object" &&
            typeof (tokenBody as { error_description?: unknown })
              .error_description === "string"
              ? (tokenBody as { error_description: string }).error_description
              : `Entra nie zwróciła tokenu dostępu (HTTP ${tokenResponse.status}${tokenText ? "" : "; pusta odpowiedź"}).`;
          throw new Error(`Entra ${oauthError}: ${description}`);
        }

        setObjectId(getTokenObjectId(accessToken));
        setStatus("Inicjalizuję połączenie MCP...");
        const mcpHeaders = {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          "MCP-Protocol-Version": "2025-03-26",
          authorization: `Bearer ${accessToken}`,
        };
        const initializeResponse = await fetch("/api/mcp", {
          method: "POST",
          headers: mcpHeaders,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: {
                name: "climberbook-mcp-auth-test",
                version: "0.1.0",
              },
            },
          }),
        });
        const sessionId = initializeResponse.headers.get("mcp-session-id");
        const initializeText = await initializeResponse.text();
        if (!initializeResponse.ok || !initializeText || !sessionId) {
          throw new Error(
            `MCP initialize: HTTP ${initializeResponse.status}${initializeText ? ` - ${initializeText}` : " (pusta odpowiedź)"}${sessionId ? "" : "; brak Mcp-Session-Id"}`,
          );
        }
        const initializeBody = JSON.parse(initializeText) as {
          result?: { protocolVersion?: string };
        };
        if (!initializeBody.result?.protocolVersion) {
          throw new Error(
            "MCP initialize nie zwróciło poprawnej odpowiedzi JSON-RPC.",
          );
        }

        if (shouldSaveTestTraining) {
          setStatus("Zapisuję zatwierdzony trening testowy przez MCP...");
          const response = await fetch("/api/mcp", {
            method: "POST",
            headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: {
                name: "create_training",
                arguments: {
                  mode: "confirm",
                  date: "2026-08-12",
                  time: "01:35",
                  durationMinutes: 60,
                  surfaces: ["lina"],
                  difficultyBySurface: { lina: "7a, 7b" },
                  attemptsCount: 2,
                  notes:
                    "Testowy trening liny: dwie drogi 7a i 7b wykonane na domyślnej ścianie.",
                },
              },
            }),
          });
          const text = await response.text();
          if (!response.ok || !text) {
            throw new Error(
              `MCP create_training: HTTP ${response.status}${text ? ` - ${text}` : " (pusta odpowiedź)"}.`,
            );
          }
          const savedTraining = JSON.parse(text) as unknown;
          getMcpToolText(savedTraining);
          setResult(savedTraining);
          setStatus("Zapisano zatwierdzony trening testowy przez MCP.");
          return;
        }

        if (shouldSummarizeTestTraining) {
          setStatus("Wybieram najnowszy trening do podsumowania...");
          const trainingsResponse = await fetch("/api/mcp", {
            method: "POST",
            headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: {
                name: "get_trainings_in_range",
                arguments: { start: "2000-01-01", end: "2100-12-31" },
              },
            }),
          });
          const trainingsText = await trainingsResponse.text();
          if (!trainingsResponse.ok || !trainingsText) {
            throw new Error(
              `MCP get_trainings_in_range: HTTP ${trainingsResponse.status}${trainingsText ? ` - ${trainingsText}` : " (pusta odpowiedź)"}.`,
            );
          }
          const trainingsBody = JSON.parse(trainingsText) as unknown;
          const trainingsValue: unknown = JSON.parse(
            getMcpToolText(trainingsBody),
          );
          const latestTrainingId =
            Array.isArray(trainingsValue) &&
            trainingsValue[0] &&
            typeof trainingsValue[0] === "object" &&
            typeof (trainingsValue[0] as { id?: unknown }).id === "string"
              ? (trainingsValue[0] as { id: string }).id
              : null;
          if (!latestTrainingId) {
            throw new Error("Brak treningu do podsumowania.");
          }

          setStatus("Tworzę zatwierdzone podsumowanie treningu przez MCP...");
          const response = await fetch("/api/mcp", {
            method: "POST",
            headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 3,
              method: "tools/call",
              params: {
                name: "summarize_training",
                arguments: { trainingId: latestTrainingId, confirmed: true },
              },
            }),
          });
          const text = await response.text();
          if (!response.ok || !text) {
            throw new Error(
              `MCP summarize_training: HTTP ${response.status}${text ? ` - ${text}` : " (pusta odpowiedź)"}.`,
            );
          }
          const summary = JSON.parse(text) as unknown;
          getMcpToolText(summary);
          setResult(summary);
          setStatus("Zapisano zatwierdzone podsumowanie treningu przez MCP.");
          return;
        }

        setStatus("Pobieram listę narzędzi MCP...");
        const toolsResponse = await fetch("/api/mcp", {
          method: "POST",
          headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/list",
            params: {},
          }),
        });
        const toolsText = await toolsResponse.text();
        if (!toolsResponse.ok || !toolsText) {
          throw new Error(
            `MCP tools/list: HTTP ${toolsResponse.status}${toolsText ? ` - ${toolsText}` : " (pusta odpowiedź)"}.`,
          );
        }
        let toolsBody: unknown;
        try {
          toolsBody = JSON.parse(toolsText);
        } catch {
          throw new Error(
            `MCP tools/list zwróciło nieprawidłowy JSON: ${toolsText}`,
          );
        }
        const discoveredTools =
          toolsBody &&
          typeof toolsBody === "object" &&
          "result" in toolsBody &&
          (toolsBody as { result?: unknown }).result &&
          typeof (toolsBody as { result?: unknown }).result === "object" &&
          Array.isArray(
            (toolsBody as { result: { tools?: unknown } }).result.tools,
          )
            ? (toolsBody as { result: { tools: unknown[] } }).result.tools
                .map((tool) =>
                  tool &&
                  typeof tool === "object" &&
                  typeof (tool as { name?: unknown }).name === "string"
                    ? (tool as { name: string }).name
                    : null,
                )
                .filter((name): name is string => name !== null)
            : [];
        if (discoveredTools.length === 0) {
          throw new Error("MCP tools/list nie zwróciło żadnego narzędzia.");
        }
        setToolNames(discoveredTools);

        let requestId = 3;
        const readResponses: ToolResponse[] = [];
        const callReadTool = async (
          name: string,
          arguments_: Record<string, unknown>,
        ) => {
          const id = requestId++;
          const response = await fetch("/api/mcp", {
            method: "POST",
            headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id,
              method: "tools/call",
              params: { name, arguments: arguments_ },
            }),
          });
          const text = await response.text();
          if (!response.ok || !text) {
            throw new Error(
              `HTTP ${response.status}${text ? ` - ${text}` : " (pusta odpowiedź)"}.`,
            );
          }
          try {
            const body = JSON.parse(text) as unknown;
            readResponses.push({ id, name, body });
            return body;
          } catch {
            throw new Error(`Nieprawidłowy JSON: ${text}`);
          }
        };
        const checkReadTool = async (
          name: string,
          arguments_: Record<string, unknown>,
        ) => {
          try {
            const body = await callReadTool(name, arguments_);
            getMcpToolText(body);
            return {
              name,
              status: "passed",
              details: "Odpowiedź odebrana.",
            } as const;
          } catch (error) {
            return {
              name,
              status: "failed",
              details:
                error instanceof Error ? error.message : "Nieznany błąd.",
            } as const;
          }
        };

        setStatus("Testuję narzędzia odczytowe MCP...");
        const readChecks: ToolCheck[] = [];
        let trainings: unknown[] = [];
        try {
          const rangeBody = await callReadTool("get_trainings_in_range", {
            start: "2026-01-01",
            end: "2026-12-31",
          });
          const rangeValue: unknown = JSON.parse(getMcpToolText(rangeBody));
          trainings = Array.isArray(rangeValue) ? rangeValue : [];
          readChecks.push({
            name: "get_trainings_in_range",
            status: "passed",
            details: `Odebrano ${trainings.length} trening(ów).`,
          });
        } catch (error) {
          readChecks.push({
            name: "get_trainings_in_range",
            status: "failed",
            details: error instanceof Error ? error.message : "Nieznany błąd.",
          });
        }
        const firstTrainingId =
          trainings[0] &&
          typeof trainings[0] === "object" &&
          typeof (trainings[0] as { id?: unknown }).id === "string"
            ? (trainings[0] as { id: string }).id
            : null;
        readChecks.push(
          firstTrainingId
            ? await checkReadTool("get_training", {
                trainingId: firstTrainingId,
              })
            : {
                name: "get_training",
                status: "skipped",
                details: "Brak treningu w badanym zakresie.",
              },
          await checkReadTool("get_default_facility", {}),
          await checkReadTool("search_facilities", { query: "West" }),
          await checkReadTool("get_weight_entries", {
            start: "2026-01-01",
            end: "2026-12-31",
          }),
          await checkReadTool("get_training_stimulus_dictionary", {}),
          await checkReadTool("get_content_templates", {}),
          firstTrainingId
            ? await checkReadTool("get_training_stimulus", {
                trainingId: firstTrainingId,
              })
            : {
                name: "get_training_stimulus",
                status: "skipped",
                details: "Brak treningu do interpretacji bodźca.",
              },
        );
        setReadToolChecks(readChecks);

        const protectedToolChecks: ToolCheck[] = [];
        const expectToolError = async (
          name: string,
          arguments_: Record<string, unknown>,
        ) => {
          try {
            const body = await callReadTool(name, arguments_);
            try {
              getMcpToolText(body);
              return {
                name,
                status: "failed",
                details:
                  "Narzędzie zaakceptowało test, który powinien zostać odrzucony.",
              } as const;
            } catch (error) {
              return {
                name,
                status: "passed",
                details:
                  error instanceof Error
                    ? `Poprawnie odrzucono: ${error.message}`
                    : "Poprawnie odrzucono żądanie.",
              } as const;
            }
          } catch (error) {
            return {
              name,
              status: "failed",
              details:
                error instanceof Error ? error.message : "Nieznany błąd.",
            } as const;
          }
        };

        setStatus("Testuję pozostałe narzędzia MCP bez zapisu danych...");
        try {
          const hangboardDraft = await callReadTool("create_training", {
            mode: "draft",
            date: "2026-08-12",
            time: "09:00",
            durationMinutes: 10,
            surfaces: ["chwytotablica"],
            notes:
              "Krótka sesja na chwytotablicy przed wspinaniem, bez dodatkowych serii.",
          });
          const draftValue: unknown = JSON.parse(
            getMcpToolText(hangboardDraft),
          );
          const missingFields =
            draftValue &&
            typeof draftValue === "object" &&
            Array.isArray(
              (draftValue as { missingFields?: unknown }).missingFields,
            )
              ? (draftValue as { missingFields: unknown[] }).missingFields
              : [];
          protectedToolChecks.push({
            name: "create_training (hangboard context)",
            status: missingFields.some(
              (field) => field === "hangboardContext: warmup albo main",
            )
              ? "passed"
              : "failed",
            details: "Draft musi wymagać określenia roli chwytotablicy.",
          });
        } catch (error) {
          protectedToolChecks.push({
            name: "create_training (hangboard context)",
            status: "failed",
            details: error instanceof Error ? error.message : "Nieznany błąd.",
          });
        }
        protectedToolChecks.push(
          await checkReadTool("create_training", { mode: "draft" }),
          await expectToolError("record_weight", {
            date: "2026-08-12",
            time: "09:00",
            weightKg: 0,
          }),
          await expectToolError("summarize_training", {
            trainingId:
              firstTrainingId ?? "00000000-0000-0000-0000-000000000000",
            confirmed: false,
          }),
          await expectToolError("summarize_period", {
            scope: "week",
            start: "2026-01-01",
            end: "2026-01-07",
            confirmed: false,
          }),
          await checkReadTool("get_agent_actions", {}),
          await expectToolError("create_agent_action", {
            kind: "invalid_test_kind",
            title: "Test bez zapisu",
          }),
          await expectToolError("complete_agent_action", {
            actionId: "00000000-0000-0000-0000-000000000000",
          }),
          await expectToolError("publish_feed_item", {
            kind: "article",
            title: "Test",
            body: "Za krótka treść.",
          }),
        );
        setReadToolChecks((checks) => [...checks, ...protectedToolChecks]);
        setReadToolResponses(readResponses);

        setStatus("Wywołuję MCP z tokenem Entra...");
        const mcpResponse = await fetch("/api/mcp", {
          method: "POST",
          headers: { ...mcpHeaders, "Mcp-Session-Id": sessionId },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: requestId++,
            method: "tools/call",
            params: { name: "get_climbing_snapshot", arguments: {} },
          }),
        });
        const mcpText = await mcpResponse.text();
        if (!mcpText) {
          throw new Error(`MCP: HTTP ${mcpResponse.status} (pusta odpowiedź).`);
        }
        let mcpBody: unknown;
        try {
          mcpBody = JSON.parse(mcpText);
        } catch {
          throw new Error(`MCP zwróciło nieprawidłowy JSON: ${mcpText}`);
        }
        setResult(mcpBody);
        setStatus(
          mcpResponse.ok
            ? "MCP odpowiedział na żądanie z tokenem Entra."
            : "MCP odrzucił żądanie.",
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Błąd testu MCP.");
      } finally {
        history.replaceState({}, "", "/mcp-auth-test");
        sessionStorage.removeItem(stateKey);
        sessionStorage.removeItem(verifierKey);
        sessionStorage.removeItem(pendingTestTrainingKey);
        sessionStorage.removeItem(pendingTestTrainingSummaryKey);
      }
    })();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={styles.brand}>CLIMBERBOOK</p>
        <h1 className={styles.title}>Test logowania MCP</h1>
        <p>
          Ta strona sprawdza pełny przepływ Entra PKCE i wywołuje prywatne
          narzędzie MCP z uzyskanym tokenem.
        </p>
        <button
          type="button"
          onClick={() => void signIn()}
          style={{
            minHeight: "44px",
            padding: "0 18px",
            border: 0,
            borderRadius: "6px",
            background: "#19362d",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Zaloguj przez Entra i sprawdź MCP
        </button>
        <button
          type="button"
          onClick={saveApprovedTestTraining}
          style={{
            minHeight: "44px",
            marginLeft: "8px",
            padding: "0 18px",
            border: 0,
            borderRadius: "6px",
            background: "#2d725d",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Zapisz zatwierdzony trening testowy
        </button>
        <button
          type="button"
          onClick={summarizeApprovedTestTraining}
          style={{
            minHeight: "44px",
            marginLeft: "8px",
            padding: "0 18px",
            border: 0,
            borderRadius: "6px",
            background: "#7a5230",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Utwórz podsumowanie najnowszego treningu
        </button>
        <h2>Status</h2>
        <p className={styles.notice}>{status}</p>
        {objectId ? (
          <p>
            Entra object ID: <code>{objectId}</code>
          </p>
        ) : null}
        {toolNames.length > 0 ? (
          <>
            <h2>Narzędzia MCP</h2>
            <ul>
              {toolNames.map((toolName) => (
                <li key={toolName}>
                  <code>{toolName}</code>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {readToolChecks.length > 0 ? (
          <>
            <h2>Testy MCP</h2>
            <ul>
              {readToolChecks.map((check) => (
                <li key={check.name}>
                  <code>{check.name}</code>: {check.status} - {check.details}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {readToolResponses.length > 0 ? (
          <>
            <h2>Odpowiedzi testów MCP</h2>
            {readToolResponses.map((response) => (
              <details key={`${response.name}-${response.id}`}>
                <summary>
                  <code>
                    {response.name} (id: {response.id})
                  </code>
                </summary>
                <pre
                  style={{
                    overflowX: "auto",
                    padding: "16px",
                    background: "#f3f5f3",
                    color: "#19362d",
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(response.body, null, 2)}
                </pre>
              </details>
            ))}
          </>
        ) : null}
        {result ? (
          <pre
            style={{
              overflowX: "auto",
              padding: "16px",
              background: "#f3f5f3",
              color: "#19362d",
              lineHeight: 1.5,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
