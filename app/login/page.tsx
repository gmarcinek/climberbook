"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";

const providerLabels: Record<string, string> = {
  google: "Kontynuuj z Google",
  facebook: "Kontynuuj z Facebookiem",
};

export default function LoginPage() {
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);
  const [providerLoadFailed, setProviderLoadFailed] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void getProviders()
      .then((configuredProviders) => {
        setProviders(configuredProviders);
        setProviderLoadFailed(!configuredProviders);
      })
      .catch(() => setProviderLoadFailed(true));
  }, []);

  const configuredProviders = Object.values(providers ?? {}).filter(
    (provider) => provider.id in providerLabels,
  );

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl: "/trening",
      redirect: false,
    });
    setIsSubmitting(false);

    if (result?.error) {
      setError("Nieprawidłowy e-mail lub hasło.");
      return;
    }
    window.location.assign(result?.url ?? "/trening");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(145deg, #f5eee6 0%, #e7f0ec 48%, #e9edf8 100%)",
      }}
    >
      <section
        style={{
          width: "min(100%, 380px)",
          padding: "32px",
          border: "1px solid rgba(37, 52, 49, 0.18)",
          borderRadius: "8px",
          background: "rgba(255, 255, 255, 0.9)",
          boxShadow: "0 18px 44px rgba(41, 57, 51, 0.16)",
        }}
      >
        <p style={{ margin: 0, color: "#6b665e", fontSize: "0.8rem" }}>
          CLIMBERBOOK
        </p>
        <h1 style={{ margin: "8px 0 10px", fontSize: "1.8rem" }}>
          Zaloguj się
        </h1>
        <p style={{ margin: "0 0 24px", color: "#4e5954", lineHeight: 1.5 }}>
          Zaloguj się, aby przejść do swoich treningów.
        </p>
        <div style={{ display: "grid", gap: "10px" }}>
          <form
            onSubmit={submitCredentials}
            style={{ display: "grid", gap: "10px" }}
          >
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="E-mail"
              required
              style={inputStyle}
            />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Hasło"
              required
              style={inputStyle}
            />
            <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
              {isSubmitting ? "Logowanie..." : "Zaloguj się e-mailem"}
            </button>
          </form>
          {error ? <p style={errorStyle}>{error}</p> : null}
          {configuredProviders.length ? <p style={dividerStyle}>lub</p> : null}
          {configuredProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => void signIn(provider.id, { callbackUrl: "/trening" })}
              style={{
                minHeight: "44px",
                border: "1px solid #aab6ae",
                borderRadius: "6px",
                background: "#ffffff",
                color: "#19362d",
                cursor: "pointer",
                fontSize: "0.98rem",
                fontWeight: 650,
              }}
            >
              {providerLabels[provider.id]}
            </button>
          ))}
          <p
            style={{
              margin: "8px 0 0",
              color: "#4e5954",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            Nie masz konta?{" "}
            <Link href="/rejestracja" style={{ color: "#19362d", fontWeight: 700 }}>
              Zarejestruj się
            </Link>
          </p>
          {providerLoadFailed ? (
            <p style={{ margin: 0, color: "#8b2e28", lineHeight: 1.5 }}>
              Nie udało się odczytać konfiguracji logowania. Sprawdź zmienne
              środowiskowe Auth.js i uruchom aplikację ponownie.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

const inputStyle = {
  minHeight: "44px",
  boxSizing: "border-box" as const,
  width: "100%",
  padding: "0 12px",
  border: "1px solid #aab6ae",
  borderRadius: "6px",
  fontSize: "0.98rem",
};

const primaryButtonStyle = {
  minHeight: "44px",
  border: 0,
  borderRadius: "6px",
  background: "#19362d",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "0.98rem",
  fontWeight: 700,
};

const dividerStyle = {
  margin: "6px 0",
  color: "#6b665e",
  textAlign: "center" as const,
};

const errorStyle = { margin: 0, color: "#8b2e28", lineHeight: 1.5 };