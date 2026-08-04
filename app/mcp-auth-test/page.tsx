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

const stateKey = "climberbook-mcp-auth-state";
const verifierKey = "climberbook-mcp-auth-verifier";

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

export default function McpAuthTestPage() {
  const [status, setStatus] = useState("Gotowe do logowania Entra.");
  const [objectId, setObjectId] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  async function getConfig() {
    const response = await fetch("/api/mcp/auth-test-config", {
      cache: "no-store",
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        body && typeof body === "object" && "error" in body
          ? String(body.error)
          : "Nie udało się odczytać konfiguracji OAuth.",
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

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const state = search.get("state");
    if (!code || !state) return;

    const expectedState = sessionStorage.getItem(stateKey);
    const verifier = sessionStorage.getItem(verifierKey);
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
        const tokenBody: unknown = await tokenResponse.json();
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
              : "Entra nie zwróciło tokenu dostępu.";
          throw new Error(`Entra ${oauthError}: ${description}`);
        }

        setObjectId(getTokenObjectId(accessToken));
        setStatus("Wywołuję MCP z tokenem Entra...");
        const mcpResponse = await fetch("/api/mcp", {
          method: "POST",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            "MCP-Protocol-Version": "2025-03-26",
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "get_climbing_snapshot", arguments: {} },
          }),
        });
        const mcpBody: unknown = await mcpResponse.json();
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
        <h2>Status</h2>
        <p className={styles.notice}>{status}</p>
        {objectId ? (
          <p>
            Entra object ID: <code>{objectId}</code>
          </p>
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
