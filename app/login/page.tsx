"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn, type ClientSafeProvider } from "next-auth/react";

const providerLabels: Record<string, string> = {
  google: "Kontynuuj z Google",
  facebook: "Kontynuuj z Facebookiem",
  "azure-ad": "Kontynuuj z Microsoft",
};

export default function LoginPage() {
  const [providers, setProviders] = useState<Record<
    string,
    ClientSafeProvider
  > | null>(null);
  const [providerLoadFailed, setProviderLoadFailed] = useState(false);

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
          Wybierz konto, którego chcesz używać do zapisu swoich treningów.
        </p>
        <div style={{ display: "grid", gap: "10px" }}>
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
          {providerLoadFailed ? (
            <p style={{ margin: 0, color: "#8b2e28", lineHeight: 1.5 }}>
              Nie udało się odczytać konfiguracji logowania. Sprawdź zmienne
              środowiskowe Auth.js i uruchom aplikację ponownie.
            </p>
          ) : providers && configuredProviders.length === 0 ? (
            <p style={{ margin: 0, color: "#8b2e28", lineHeight: 1.5 }}>
              Logowanie nie jest jeszcze skonfigurowane.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}